"""Knowledge assessment agent with structured calibration and human-in-the-loop pauses."""

from __future__ import annotations

from typing import Any

from app.core.logging import AgentLogger
from agents.base import BaseAgent
from agents.runtime.types import AgentContext, AgentDecision


PROBE_PROMPT = """
You are the Knowledge Agent in a structured coaching system.
You are generating the next technical checkpoint question for a single roadmap skill.

Return JSON with this exact shape:
{
  "message": "assistant message that asks exactly one technical question",
  "prompt": "just the technical question itself",
  "focus": "what this question is testing",
  "notes": "short internal note"
}

Rules:
- Ask exactly one question.
- Use the roadmap skill, the user's profile answers, and prior assessment history.
- Do not repeat or lightly rephrase a previous question.
- If there was a previous weak answer, narrow in on the specific missing concept.
- Keep the question practical and concrete.
- Do not ask multiple sub-questions.
""".strip()


ASSESSMENT_PROMPT = """
You are the Knowledge Agent in a structured coaching system.
You are evaluating one user answer for one roadmap skill.

Return JSON with this exact shape:
{
  "assessment": "mastered | partial | not_ready",
  "confidence": 0.0,
  "gap": "short description of the main missing idea",
  "message": "assistant-facing explanation of the result",
  "follow_up_prompt": "one narrow follow-up question if assessment is partial, otherwise empty"
}

Rules:
- `mastered` means the user is ready to move forward on the roadmap.
- `partial` means the user shows some understanding but there is one missing idea worth checking once more.
- `not_ready` means the skill should become the learning frontier.
- Use prior answers and prior questions to avoid repetition.
- If assessment is `partial`, the follow-up must target the specific gap and must not repeat the original question.
- Keep the gap description concrete.
""".strip()


class KnowledgeAgent(BaseAgent):
    def __init__(self) -> None:
        super().__init__(name="knowledge_agent", instruction="Structured knowledge calibration agent.", tools=[])

    async def assess(self, context: AgentContext) -> AgentDecision:
        mode = str(context.state.get("mode", "generate_probe"))
        if mode == "generate_probe":
            return await self._generate_probe(context)
        if mode == "assess_answer":
            return await self._assess_answer(context)
        return await self.run(context)

    async def _generate_probe(self, context: AgentContext) -> AgentDecision:
        target_skill = context.state.get("target_skill") or {}
        knowledge_state = context.state.get("knowledge_state") or {}
        skill_state = (knowledge_state.get("skills") or {}).get(target_skill.get("id", ""), {})
        calibration = knowledge_state.get("calibration") or {}
        profile_answers = context.state.get("profile_answers") or []

        messages = [
            {"role": "system", "content": PROBE_PROMPT},
            {
                "role": "user",
                "content": (
                    "Generate the next knowledge-calibration question.\n\n"
                    f"Target skill: {target_skill}\n\n"
                    f"Calibration state: {calibration}\n\n"
                    f"Profile answers: {profile_answers}\n\n"
                    f"Skill assessment history: {skill_state}\n\n"
                    f"Latest user message: {context.user_message}"
                ),
            },
        ]
        response = await self.llm.complete_json(messages, max_tokens=900, agent_name=self.name)

        prompt = str(response.get("prompt") or "").strip() or self._fallback_probe(target_skill, skill_state)
        message = str(response.get("message") or "").strip() or prompt
        focus = str(response.get("focus") or "").strip()
        notes = str(response.get("notes") or "").strip()

        attempts = int(skill_state.get("attempts", 0))
        current_probe = {
            "skill_id": target_skill.get("id"),
            "skill_title": target_skill.get("title"),
            "prompt": prompt,
            "focus": focus,
            "attempt_number": attempts + 1,
            "notes": notes,
        }

        AgentLogger.info(
            event="knowledge_probe_generated",
            component="knowledge_agent",
            session_id=context.session_id,
            skill_id=target_skill.get("id"),
            attempt_number=attempts + 1,
            prompt_preview=AgentLogger.preview(prompt, size=180),
        )

        return AgentDecision(
            status="awaiting_user",
            message=message,
            state_patch={
                "knowledge_state": {
                    "current_probe": current_probe,
                }
            },
            metadata={"focus": focus},
        )

    async def _assess_answer(self, context: AgentContext) -> AgentDecision:
        target_skill = context.state.get("target_skill") or {}
        knowledge_state = context.state.get("knowledge_state") or {}
        skill_id = str(target_skill.get("id", ""))
        skill_state = dict((knowledge_state.get("skills") or {}).get(skill_id, {}))
        current_probe = knowledge_state.get("current_probe") or {}
        profile_answers = context.state.get("profile_answers") or []
        attempts = int(skill_state.get("attempts", 0)) + 1
        prior_answers = list(skill_state.get("answers") or [])
        prior_questions = list(skill_state.get("asked_questions") or [])

        messages = [
            {"role": "system", "content": ASSESSMENT_PROMPT},
            {
                "role": "user",
                "content": (
                    "Assess the user's answer for roadmap placement.\n\n"
                    f"Target skill: {target_skill}\n\n"
                    f"Profile answers: {profile_answers}\n\n"
                    f"Prior questions: {prior_questions}\n\n"
                    f"Prior answers: {prior_answers}\n\n"
                    f"Current question: {current_probe}\n\n"
                    f"User answer: {context.user_message}"
                ),
            },
        ]
        response = await self.llm.complete_json(messages, max_tokens=1100, agent_name=self.name)

        assessment = str(response.get("assessment") or "not_ready").strip().lower()
        if assessment not in {"mastered", "partial", "not_ready"}:
            assessment = "not_ready"

        try:
            confidence = float(response.get("confidence", 0.0))
        except (TypeError, ValueError):
            confidence = 0.0
        confidence = max(0.0, min(confidence, 1.0))

        gap = str(response.get("gap") or "").strip()
        message = str(response.get("message") or "").strip()
        follow_up_prompt = str(response.get("follow_up_prompt") or "").strip()

        asked_questions = prior_questions + ([current_probe.get("prompt")] if current_probe.get("prompt") else [])
        answers = prior_answers + [
            {
                "question": current_probe.get("prompt"),
                "answer": context.user_message,
                "assessment": assessment,
                "gap": gap,
                "confidence": confidence,
            }
        ]

        updated_skill_state = {
            **skill_state,
            "attempts": attempts,
            "confidence": confidence,
            "status": "in_progress" if assessment == "partial" else assessment,
            "last_gap": gap,
            "asked_questions": asked_questions,
            "answers": answers,
        }

        AgentLogger.info(
            event="knowledge_answer_assessed",
            component="knowledge_agent",
            session_id=context.session_id,
            skill_id=skill_id,
            attempt_number=attempts,
            assessment=assessment,
            confidence=confidence,
            gap=gap,
        )

        if assessment == "partial" and attempts < 2 and follow_up_prompt:
            updated_skill_state["status"] = "in_progress"
            return AgentDecision(
                status="awaiting_user",
                message=follow_up_prompt,
                state_patch={
                    "knowledge_state": {
                        "current_probe": {
                            "skill_id": target_skill.get("id"),
                            "skill_title": target_skill.get("title"),
                            "prompt": follow_up_prompt,
                            "focus": gap,
                            "attempt_number": attempts + 1,
                        },
                        "skills": {skill_id: updated_skill_state},
                    }
                },
                metadata={"assessment": assessment, "gap": gap, "confidence": confidence},
            )

        if assessment in {"partial", "not_ready"}:
            updated_skill_state["status"] = "frontier"
            return AgentDecision(
                status="completed",
                message=message or f"I found a gap around {target_skill.get('title', 'this skill')}. I am setting this as your current learning frontier.",
                state_patch={
                    "knowledge_state": {
                        "current_probe": None,
                        "learning_frontier": target_skill,
                        "skills": {skill_id: updated_skill_state},
                    }
                },
                metadata={"assessment": "frontier", "gap": gap, "confidence": confidence},
            )

        return AgentDecision(
            status="completed",
            message=message or f"You look comfortable with {target_skill.get('title', 'this skill')}.",
            state_patch={
                "knowledge_state": {
                    "current_probe": None,
                    "skills": {skill_id: updated_skill_state},
                }
            },
            metadata={"assessment": "mastered", "gap": gap, "confidence": confidence},
        )

    def _fallback_probe(self, target_skill: dict[str, Any], skill_state: dict[str, Any]) -> str:
        gap = str(skill_state.get("last_gap") or "").strip()
        title = target_skill.get("title") or "this skill"
        if gap:
            return f"Focus on {title}. Walk me through the specific idea around '{gap}' and show how you would use it in practice."
        return f"For {title}, explain the core idea in your own words and give one practical example or implementation approach."
