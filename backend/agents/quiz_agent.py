"""Agent responsible for generating four-option multiple-choice questions."""

from __future__ import annotations

import hashlib
from typing import Any

from agents.base import BaseAgent
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
- Match the user's reading level.
- For retry questions, target the missed concept without repeating the previous wording.
- Avoid repeating any concept or wording seen in recent placement history.
- Avoid multi-part questions.
""".strip()


class QuizAgent(BaseAgent):
    def __init__(self) -> None:
        super().__init__(name="quiz_agent", instruction="Generate multiple-choice quizzes.", tools=[])

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
        reading_level = self._reading_level(context.state)

        messages = [
            {"role": "system", "content": QUIZ_PROMPT},
            {
                "role": "user",
                "content": (
                    "Generate the next quiz question.\n\n"
                    f"Quiz scope: {scope}\n\n"
                    f"Reading level: {reading_level}\n\n"
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

    def _reading_level(self, state: dict[str, Any]) -> str:
        learner_profile = state.get("learner_profile") or {}
        if learner_profile.get("reading_level"):
            return str(learner_profile["reading_level"])
        for answer in state.get("profile_answers") or []:
            if answer.get("id") == "reading_level" and answer.get("answer"):
                return str(answer["answer"])
        return "high school"

    def _slugify(self, value: str) -> str:
        pieces = [part for part in "".join(ch.lower() if ch.isalnum() else "-" for ch in value).split("-") if part]
        return "-".join(pieces[:6]) or "concept"

    def _fingerprint(self, *, scope: str, skill_id: str, prompt: str, focus: str, concept_id: str) -> str:
        raw = f"{scope}|{skill_id}|{concept_id}|{focus}|{prompt}".encode("utf-8")
        return hashlib.sha1(raw).hexdigest()[:16]
