"""Multiple-choice quiz generation and post-answer explanations (direct LLM calls, not ReAct)."""

from __future__ import annotations

import hashlib
from typing import Any

from agents.runtime.providers import ProviderRouter
from agents.runtime.types import AgentContext

QUIZ_PROMPT = """
You are the Quiz Agent in a structured coaching system.
Generate exactly one multiple-choice question with exactly 4 answer options.

Return JSON with this exact shape:
{
  "message": "short assistant intro for the quiz",
  "prompt": "the question text",
  "options": ["option one", "option two", "option three", "option four"],
  "correct_option_index": 0,
  "explanation": "brief explanation of why the correct option is right",
  "focus": "what concept this question measures",
  "concept_id": "short concept slug",
  "difficulty": "easy | medium | hard"
}

Rules:
- Exactly 4 answer options.
- Exactly 1 correct answer.
- Keep distractors plausible.
- Use clear, plain language in the question and options (define a term briefly only if the question depends on it).
- For retry questions, target the missed concept without repeating the previous wording.
- Avoid repeating any concept or wording seen in recent placement history.
- Avoid multi-part questions.
- Use Markdown in the prompt/explanation/messages when it helps clarity (code, lists, emphasis).
- Keep options short; inline code is ok.
""".strip()

PLACEMENT_PROMPT = """
You are the Quiz Agent running a placement test.
Generate exactly one multiple-choice question with exactly 4 answer options.

Return JSON with this exact shape:
{
  "message": "short assistant intro for the quiz",
  "prompt": "the question text",
  "options": ["option one", "option two", "option three", "option four"],
  "correct_option_index": 0,
  "explanation": "brief explanation of why the correct option is right",
  "focus": "what concept this question measures",
  "concept_id": "short concept slug",
  "difficulty": "easy | medium | hard"
}

Rules:
- Exactly 4 answer options.
- Exactly 1 correct answer.
- Keep the question short and focused.
- Use only the target skill and the prior question context if provided.
- Avoid repeating the prior question wording.
- Use Markdown in the prompt/explanation/messages when it helps clarity (code, lists, emphasis).
- Keep options short; inline code is ok.
""".strip()

OUTCOME_EXPLANATION_PROMPT = """
You explain quiz results to a learner after they submit an answer.
This is for lesson quizzes (topic / skill / domain checks), not placement diagnostics.

Return JSON with exactly this shape:
{ "explanation": "markdown string" }

Rules:
- Open with one clear sentence stating whether their answer was correct or incorrect.
- Explain why the keyed correct answer is right (use the reference explanation as ground truth; expand if needed).
- If they were wrong, briefly contrast their choice with the correct idea—no shaming.
- Use clear, direct wording (short sentences when possible).
- Stay under ~180 words unless the concept truly needs more.
- Use Markdown when it helps (short lists, `inline code` for technical terms).
- Do not repeat the full question stem verbatim.
""".strip()


class QuizAgent:
    """Generates quizzes and outcome copy via structured JSON LLM calls only."""

    name = "quiz_agent"

    def __init__(self) -> None:
        self.llm = ProviderRouter()

    async def generate(self, context: AgentContext) -> dict[str, Any]:
        scope = str(context.state.get("quiz_scope") or "knowledge_probe")
        target_skill = context.state.get("target_skill") or {}
        target_topic = context.state.get("target_topic") or {}
        target_domain = context.state.get("target_domain") or {}
        prior_quiz = context.state.get("prior_quiz") or {}
        retry_reason = str(context.state.get("retry_reason") or "").strip()
        placement_plan = context.state.get("placement_plan") or {}
        placement_history = list(context.state.get("placement_history") or [])[-4:]
        recent_question_fingerprints = list(context.state.get("recent_question_fingerprints") or [])[-6:]
        placement_state = context.state.get("placement_state") or {}

        placement_mode = str(context.state.get("placement_mode") or "").strip()
        prior_question = context.state.get("prior_question") or {}
        if placement_mode == "binary_search" or scope == "placement_probe":
            messages = [
                {"role": "system", "content": PLACEMENT_PROMPT},
                {
                    "role": "user",
                    "content": (
                        "Generate the next placement question.\n\n"
                        f"Target skill: {target_skill}\n\n"
                        f"Prior question: {prior_question}\n\n"
                        f"Latest orchestration message: {context.user_message}"
                    ),
                },
            ]
        else:
            messages = [
                {"role": "system", "content": QUIZ_PROMPT},
                {
                    "role": "user",
                    "content": (
                        "Generate the next quiz question.\n\n"
                        f"Quiz scope: {scope}\n\n"
                        f"Target skill: {target_skill}\n\n"
                        f"Target topic: {target_topic}\n\n"
                        f"Target domain: {target_domain}\n\n"
                        f"Prior quiz: {prior_quiz}\n\n"
                        f"Placement plan: {placement_plan}\n\n"
                        f"Placement summary: {placement_state}\n\n"
                        f"Placement history: {placement_history}\n\n"
                        f"Recent question fingerprints: {recent_question_fingerprints}\n\n"
                        f"Retry reason: {retry_reason}\n\n"
                        f"Latest orchestration message: {context.user_message}"
                    ),
                },
            ]
        response = await self.llm.complete_json(messages, max_tokens=1200, agent_name=self.name)

        prompt = str(response.get("prompt") or "").strip() or self._fallback_prompt(scope, target_skill, target_topic, target_domain)
        options = self._normalize_options(response.get("options"))
        explanation = str(response.get("explanation") or "").strip() or "The correct answer best matches the concept being tested."
        message = str(response.get("message") or "").strip() or "Choose the best answer to continue."
        focus = str(response.get("focus") or "").strip() or str(placement_plan.get("focus") or "")
        concept_id = str(response.get("concept_id") or "").strip() or self._slugify(str(placement_plan.get("concept_id") or focus or prompt))
        difficulty = str(response.get("difficulty") or "").strip().lower() or str(placement_plan.get("difficulty") or "medium")
        if difficulty not in {"easy", "medium", "hard"}:
            difficulty = "medium"
        placement_stage = str(placement_plan.get("placement_stage") or "").strip() or None
        question_kind = str(placement_plan.get("question_kind") or scope).strip()
        attempt_number = int(placement_plan.get("attempt_number") or 1)
        question_fingerprint = self._fingerprint(
            scope=scope,
            skill_id=str(target_skill.get("id") or ""),
            prompt=prompt,
            focus=focus,
            concept_id=concept_id,
        )

        try:
            correct_option_index = int(response.get("correct_option_index", 0))
        except (TypeError, ValueError):
            correct_option_index = 0
        correct_option_index = max(0, min(correct_option_index, 3))

        return {
            "message": message,
            "prompt": prompt,
            "options": options,
            "correct_option_index": correct_option_index,
            "explanation": explanation,
            "focus": focus,
            "concept_id": concept_id,
            "difficulty": difficulty,
            "placement_stage": placement_stage,
            "question_kind": question_kind,
            "attempt_number": attempt_number,
            "question_fingerprint": question_fingerprint,
        }

    async def explain_outcome(
        self,
        *,
        quiz: dict[str, Any],
        selected_index: int,
        is_correct: bool,
    ) -> str:
        """LLM copy for the quiz overlay only (not chat). Runs right after correctness is known."""
        options = list(quiz.get("options") or [])
        labels = [str((opt or {}).get("label") or "") for opt in options]
        correct_idx = int(quiz.get("correct_option_index") or 0)
        correct_idx = max(0, min(correct_idx, len(labels) - 1 if labels else 0))
        selected_idx = max(0, min(selected_index, len(labels) - 1 if labels else 0))
        reference = str(quiz.get("explanation") or "").strip()
        kind = str(quiz.get("question_kind") or "")

        payload = (
            f"Question kind: {kind}\n"
            f"Outcome: {'CORRECT' if is_correct else 'INCORRECT'}\n\n"
            f"Question prompt:\n{quiz.get('prompt') or ''}\n\n"
            f"Options (index: label):\n"
            + "\n".join(f"  {i}: {labels[i]}" for i in range(len(labels)))
            + f"\n\nLearner chose index {selected_idx}: {labels[selected_idx] if labels else ''}\n"
            f"Correct index {correct_idx}: {labels[correct_idx] if labels else ''}\n\n"
            f"Author reference explanation (ground truth):\n{reference or '(none)'}\n"
        )
        messages = [
            {"role": "system", "content": OUTCOME_EXPLANATION_PROMPT},
            {"role": "user", "content": payload},
        ]
        response = await self.llm.complete_json(messages, max_tokens=700, agent_name=f"{self.name}_outcome")
        text = str(response.get("explanation") or "").strip()
        return text or self._fallback_outcome_explanation(quiz, is_correct)

    def _fallback_outcome_explanation(self, quiz: dict[str, Any], is_correct: bool) -> str:
        ref = str(quiz.get("explanation") or "").strip()
        lead = "**That's correct.**" if is_correct else "**Not quite.**"
        return f"{lead}\n\n{ref}" if ref else lead

    def _normalize_options(self, raw_options: Any) -> list[str]:
        options = [str(item).strip() for item in list(raw_options or []) if str(item).strip()]
        if len(options) == 4:
            return options
        fallback = [
            "This is the best answer.",
            "This is partially related but incomplete.",
            "This sounds reasonable but misses the key idea.",
            "This does not fit the concept being tested.",
        ]
        return (options + fallback)[:4]

    def _fallback_prompt(
        self,
        scope: str,
        target_skill: dict[str, Any],
        target_topic: dict[str, Any],
        target_domain: dict[str, Any],
    ) -> str:
        if scope == "topic_quiz":
            title = target_topic.get("title") or "this topic"
            return f"Which option best demonstrates the core idea behind {title}?"
        if scope == "domain_quiz":
            title = target_domain.get("title") or "this domain"
            return f"Which option best summarizes the most important pattern from {title}?"
        title = target_skill.get("title") or "this skill"
        return f"Which option best shows working knowledge of {title}?"

    def _slugify(self, value: str) -> str:
        pieces = [part for part in "".join(ch.lower() if ch.isalnum() else "-" for ch in value).split("-") if part]
        return "-".join(pieces[:6]) or "concept"

    def _fingerprint(self, *, scope: str, skill_id: str, prompt: str, focus: str, concept_id: str) -> str:
        raw = f"{scope}|{skill_id}|{concept_id}|{focus}|{prompt}".encode("utf-8")
        return hashlib.sha1(raw).hexdigest()[:16]
