"""Knowledge agent that plans adaptive probes around BKT-selected skills."""

from __future__ import annotations

from typing import Any

from app.core.logging import AgentLogger
from agents.base import BaseAgent
from agents.runtime.types import AgentContext

PLACEMENT_PLAN_PROMPT = """
You are the Knowledge Agent in a structured coaching system.
Your job is to describe the best next probe for the supplied target skill.

Return JSON with this exact shape:
{
  "placement_stage": "placement_probe | placement_confirm",
  "difficulty": "easy | medium | hard",
  "focus": "one precise concept to test",
  "concept_id": "short-stable-concept-slug",
  "message": "one short natural message introducing the next placement check"
}

Rules:
- The supplied candidate skills may contain only one skill. Treat that as the required target.
- Use prior placement history and the supplied BKT state to avoid repeating the same idea or wording.
- Prefer a concept that is discriminative for refining the learner's mastery estimate.
- Use `placement_confirm` only when the supplied confidence is already moderate and you want a confirming signal.
- Keep the focus narrow and concrete.
""".strip()


class KnowledgeAgent(BaseAgent):
    def __init__(self) -> None:
        super().__init__(name="knowledge_agent", instruction="Structured BKT-aware probe planning agent.", tools=[])

    async def plan_placement_probe(self, context: AgentContext) -> dict[str, Any]:
        candidate_skills = list(context.state.get("candidate_skills") or [])
        placement_state = context.state.get("placement_state") or {}
        messages = [
            {"role": "system", "content": PLACEMENT_PLAN_PROMPT},
            {
                "role": "user",
                "content": (
                    "Choose the next placement probe.\n\n"
                    f"Candidate skills: {candidate_skills}\n\n"
                    f"Placement state: {placement_state}\n\n"
                    f"Profile answers: {context.state.get('profile_answers') or []}\n\n"
                    f"Selected skill BKT state: {context.state.get('selected_skill_state') or {}}\n\n"
                    f"Recent placement history: {placement_state.get('global_history') or []}\n\n"
                    f"Latest user message: {context.user_message}"
                ),
            },
        ]
        response = await self.llm.complete_json(messages, max_tokens=1000, agent_name=self.name)

        candidate_map = {int(item["absolute_index"]): item for item in candidate_skills if "absolute_index" in item}
        fallback_index = next(iter(candidate_map.keys()), 0)
        target_absolute_index = fallback_index

        placement_stage = str(response.get("placement_stage") or "placement_probe").strip()
        if placement_stage not in {"placement_probe", "placement_confirm"}:
            placement_stage = "placement_probe"

        difficulty = str(response.get("difficulty") or "medium").strip().lower()
        if difficulty not in {"easy", "medium", "hard"}:
            difficulty = "medium"

        target_skill = candidate_map.get(target_absolute_index) or {}
        focus = str(response.get("focus") or "").strip() or self._fallback_focus(target_skill)
        concept_id = str(response.get("concept_id") or "").strip() or self._slugify(focus or target_skill.get("title") or "placement")
        message = str(response.get("message") or "").strip() or f"Let’s place your current level around {target_skill.get('title', 'this skill')}."

        AgentLogger.info(
            event="placement_probe_planned",
            component="knowledge_agent",
            session_id=context.session_id,
            skill_id=target_skill.get("id"),
            placement_stage=placement_stage,
            focus=focus,
        )

        return {
            "placement_stage": placement_stage,
            "difficulty": difficulty,
            "focus": focus,
            "concept_id": concept_id,
            "message": message,
        }

    def _fallback_focus(self, target_skill: dict[str, Any]) -> str:
        title = str(target_skill.get("title") or "this skill").strip()
        description = str(target_skill.get("description") or "").strip()
        if description:
            return description[:120]
        return f"core concept of {title}"

    def _slugify(self, value: str) -> str:
        pieces = [part for part in "".join(ch.lower() if ch.isalnum() else "-" for ch in value).split("-") if part]
        return "-".join(pieces[:6]) or "placement-concept"
