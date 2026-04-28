"""Post-lecture immersive scenario turns: structured JSON only, not ReAct."""

from __future__ import annotations

import logging
from typing import Any

from agents.runtime.providers import ProviderRouter
from agents.runtime.types import AgentContext

logger = logging.getLogger(__name__)

DUNGEON_SYSTEM_PROMPT = """
You are the Dungeon Agent: you run a tense, in-world fictional scenario tied to the learner's
current lesson topic and skills. You are NOT a tutor, coach, or explainer. Never lecture,
define terms pedagogically, or say "as we learned" or "remember that".

Language:
- Write **clear, readable narration**: short-to-medium sentences, concrete images, everyday words.
- Avoid stacking technical jargon, buzzwords, or insider slang in one beat. If a specialized word fits the scene, use it **sparingly** (at most one per beat unless unavoidable) and keep the rest plain so the moment stays visceral, not like a textbook or pitch deck.
- If the user seems to not try or says "I give up", do not be afraid to end the scenario with a failure.

Return JSON only with this exact shape (no markdown fences around the JSON):
{
  "narration": "markdown, second-person, present tense, sensory and immediate",
  "decision_state": "continue" | "success" | "failure",
  "success_condition": "only on bootstrap turn: concrete observable win criterion",
  "failure_condition": "only on bootstrap turn: concrete observable lose criterion",
  "scenario_title": "optional short title for continuity",
  "stakes_tier": optional integer 1-5 escalating tension,
  "internal_notes": "optional, for your reasoning only; may be stripped by the server"
}

Hard rules:
- On the FIRST turn only (bootstrap, no prior buffer entries from the player): you MUST set
  success_condition and failure_condition as specific, observable in-scene outcomes. After that,
  NEVER change or reinterpret them; the server will repeat the stored criteria every turn—treat
  them as law.
- Do NOT emit success_condition or failure_condition on turns after the first.
- decision_state "success" means the player has clearly satisfied the stored success_condition.
  "failure" means they clearly triggered the stored failure_condition or an irreversible loss.
- You MUST NOT set decision_state to "success" before turn_index >= 4 unless the player
  explicitly and immediately walks into an obvious failure path (then "failure" is allowed earlier).
  Early cheap wins are forbidden.
- Before any resolution (success or failure), build at least 2–3 meaningful complications,
  obstacles, or escalations—not a single binary choice on turn 1–2.
- Escalate stakes across turns (time pressure, irreversible choices, resources draining).


Anti-patterns (never):
- Breaking character to teach the syllabus
- Vague win/lose ("do well", "understand the concept")
- Resetting or redefining success/failure mid-run
- Instant success without tension
- Multiple paragraphs of exposition without a situation the player can act in
""".strip()


class DungeonAgent:
    """One structured JSON turn for the dungeon loop."""

    name = "dungeon_agent"

    def __init__(self) -> None:
        self.llm = ProviderRouter()

    async def turn(self, context: AgentContext) -> dict[str, Any]:
        state = context.state or {}
        dungeon_ctx = state.get("dungeon_context") or {}
        topic = dungeon_ctx.get("topic") or {}
        skill = dungeon_ctx.get("skill") or {}
        domain = dungeon_ctx.get("domain") or {}
        related_skills = dungeon_ctx.get("related_skill_titles") or []
        buffer = dungeon_ctx.get("buffer") or []
        turn_index = int(dungeon_ctx.get("turn_index") or 0)
        is_bootstrap = bool(dungeon_ctx.get("is_bootstrap"))
        success_condition = dungeon_ctx.get("success_condition")
        failure_condition = dungeon_ctx.get("failure_condition")
        scenario_title = dungeon_ctx.get("scenario_title")
        stakes_tier = dungeon_ctx.get("stakes_tier")

        user_block = {
            "turn_index": turn_index,
            "is_bootstrap": is_bootstrap,
            "topic": topic,
            "current_skill": skill,
            "domain": domain,
            "related_skill_titles": related_skills,
            "scenario_title": scenario_title,
            "stakes_tier": stakes_tier,
            "fixed_success_condition": success_condition,
            "fixed_failure_condition": failure_condition,
            "recent_exchange_buffer": buffer,
            "player_action": context.user_message if not is_bootstrap else None,
        }

        messages = [
            {"role": "system", "content": DUNGEON_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "Produce the next dungeon beat as JSON.\n\n"
                    f"If is_bootstrap is true: open the scenario with strong hook and set "
                    f"success_condition and failure_condition (observable in-world). "
                    f"If is_bootstrap is false: react to player_action and the buffer; respect "
                    f"fixed_success_condition and fixed_failure_condition.\n\n"
                    f"Context JSON:\n{user_block!r}"
                ),
            },
        ]

        try:
            response = await self.llm.complete_json(messages, max_tokens=1400, agent_name=self.name)
        except Exception as exc:  # noqa: BLE001
            logger.warning("dungeon_agent LLM failure: %s", exc)
            return self._fallback_continue(is_bootstrap)

        if not isinstance(response, dict):
            return self._fallback_continue(is_bootstrap)

        narration = str(response.get("narration") or "").strip()
        if not narration:
            narration = "Something shifts in the scene—what do you do?"

        raw_state = str(response.get("decision_state") or "continue").strip().lower()
        if raw_state not in {"continue", "success", "failure"}:
            raw_state = "continue"

        # Enforce minimum turns before success (server-side guard)
        if raw_state == "success" and turn_index < 4:
            raw_state = "continue"
            narration += "\n\n*(The moment hangs—you are not out of it yet.)*"

        out: dict[str, Any] = {
            "narration": narration,
            "decision_state": raw_state,
        }

        if is_bootstrap:
            sc = str(response.get("success_condition") or "").strip()
            fc = str(response.get("failure_condition") or "").strip()
            if sc:
                out["success_condition"] = sc
            if fc:
                out["failure_condition"] = fc
            st = response.get("scenario_title")
            if st:
                out["scenario_title"] = str(st).strip()[:200]
            tier = response.get("stakes_tier")
            try:
                t = int(tier)
                if 1 <= t <= 5:
                    out["stakes_tier"] = t
            except (TypeError, ValueError):
                pass

        return out

    def _fallback_continue(self, is_bootstrap: bool) -> dict[str, Any]:
        base = {
            "narration": (
                "The scene holds its breath—edges blur, then steady again. "
                "What is your next move?"
                if is_bootstrap
                else "You hesitate; the situation tightens. What do you do?"
            ),
            "decision_state": "continue",
        }
        if is_bootstrap:
            base["success_condition"] = "You achieve the concrete goal stated in the scenario before time or resources run out."
            base["failure_condition"] = "You are caught, incapacitated, or the critical opportunity is permanently lost."
            base["scenario_title"] = "Pressure scenario"
            base["stakes_tier"] = 2
        return base
