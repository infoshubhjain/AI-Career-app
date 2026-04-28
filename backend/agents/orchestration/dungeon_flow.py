"""Post-lecture immersive dungeon loop: buffer memory, strict JSON agent, quiz gating."""

from __future__ import annotations

from typing import Any

from app.models.agent import AgentSessionResponse, AgentTurnRequest, DungeonTurnPayload
from agents.runtime.types import AgentContext


class DungeonFlowMixin:
    DUNGEON_BUFFER_CAP = 12

    def _dungeon_assistant_beat_count(self, dungeon: dict[str, Any]) -> int:
        buf = dungeon.get("buffer") or []
        return sum(1 for e in buf if isinstance(e, dict) and e.get("role") == "assistant")

    def _trim_dungeon_buffer(self, dungeon: dict[str, Any]) -> None:
        buf = list(dungeon.get("buffer") or [])
        if len(buf) > self.DUNGEON_BUFFER_CAP:
            dungeon["buffer"] = buf[-self.DUNGEON_BUFFER_CAP :]

    def _related_skill_titles(self, state: dict[str, Any], roadmap_json: dict[str, Any], *, cap: int = 8) -> list[str]:
        ordered = self._ordered_skills(roadmap_json)
        cur = self._current_skill(state, roadmap_json)
        idx = None
        for i, item in enumerate(ordered):
            if item.get("id") == cur.get("id") and item.get("domain_id") == cur.get("domain_id"):
                idx = i
                break
        if idx is None:
            return [str(cur.get("title") or "Skill")][:cap]
        lo = max(0, idx - 3)
        hi = min(len(ordered), idx + 4)
        titles = [str(s.get("title") or "") for s in ordered[lo:hi] if s.get("title")]
        return titles[:cap]

    def _dungeon_topic_skill_context(
        self, session: dict[str, Any], state: dict[str, Any]
    ) -> tuple[dict[str, Any], dict[str, Any], list[str]]:
        topic = self._current_topic(state)
        skill = self._current_skill(state, session["roadmap_json"])
        related = self._related_skill_titles(state, session["roadmap_json"])
        domain = {"id": skill.get("domain_id"), "title": skill.get("domain_title")}
        skill_payload = {
            "id": skill.get("id"),
            "title": skill.get("title"),
            "description": (skill.get("description") or "")[:400],
        }
        topic_payload = {
            "id": topic.get("id"),
            "title": topic.get("title"),
            "objective": (topic.get("objective") or "")[:500],
        }
        return topic_payload, skill_payload, related

    def _build_dungeon_agent_context(
        self,
        session: dict[str, Any],
        state: dict[str, Any],
        dungeon: dict[str, Any],
        *,
        user_message: str,
        is_bootstrap: bool,
    ) -> AgentContext:
        topic, skill, related = self._dungeon_topic_skill_context(session, state)
        beat = self._dungeon_assistant_beat_count(dungeon)
        ctx = {
            "topic": topic,
            "skill": skill,
            "domain": {"id": skill.get("domain_id"), "title": skill.get("domain_title")},
            "related_skill_titles": related,
            "buffer": list(dungeon.get("buffer") or [])[-self.DUNGEON_BUFFER_CAP :],
            "turn_index": beat,
            "is_bootstrap": is_bootstrap,
            "success_condition": dungeon.get("success_condition"),
            "failure_condition": dungeon.get("failure_condition"),
            "scenario_title": dungeon.get("scenario_title"),
            "stakes_tier": dungeon.get("stakes_tier"),
        }
        return AgentContext(
            session_id=session["id"],
            user_id=str(session["user_id"]),
            user_message=user_message,
            state={**state, "dungeon_context": ctx},
            metadata={"stage": "dungeon_turn"},
        )

    async def _handle_dungeon_start(self, session: dict[str, Any], turn: AgentTurnRequest) -> AgentSessionResponse:
        state = session["state"]
        status = session["status"]
        if status != "awaiting_topic_followup":
            return self._session_response(session, message="Dungeon is only available after a topic lecture, when you can start the quiz.")
        conv = state.get("conversation_state") or {}
        topic = self._current_topic(state)
        current_tid = conv.get("current_topic_id")
        if not conv.get("awaiting_quiz_consent"):
            return self._session_response(
                session,
                message="Keep exploring this topic in the chat first. Dungeon unlocks when you are ready for the quiz.",
            )
        if current_tid and topic.get("id") and current_tid != topic.get("id"):
            return self._session_response(session, message="Topic state is out of sync. Try reloading the session.")

        dungeon: dict[str, Any] = {
            "active": True,
            "success_condition": None,
            "failure_condition": None,
            "buffer": [],
            "scenario_title": None,
            "stakes_tier": None,
        }
        state["dungeon"] = dungeon
        context = self._build_dungeon_agent_context(session, state, dungeon, user_message="", is_bootstrap=True)
        raw = await self.dungeon_agent.turn(context)
        narration = str(raw.get("narration") or "").strip() or "The scene opens—what do you do?"
        decision = str(raw.get("decision_state") or "continue").lower()
        if decision not in {"continue", "success", "failure"}:
            decision = "continue"

        dungeon["success_condition"] = str(raw.get("success_condition") or "").strip() or dungeon.get("success_condition")
        dungeon["failure_condition"] = str(raw.get("failure_condition") or "").strip() or dungeon.get("failure_condition")
        if raw.get("scenario_title"):
            dungeon["scenario_title"] = str(raw.get("scenario_title"))[:200]
        if raw.get("stakes_tier") is not None:
            try:
                t = int(raw["stakes_tier"])
                if 1 <= t <= 5:
                    dungeon["stakes_tier"] = t
            except (TypeError, ValueError):
                pass

        dungeon.setdefault("success_condition", "You reach the stated in-scene goal before losing control of the situation.")
        dungeon.setdefault("failure_condition", "You lose control, are caught, or the critical window closes for good.")

        dungeon["buffer"].append({"role": "assistant", "text": narration, "decision_state": decision})
        self._trim_dungeon_buffer(dungeon)

        if decision in {"success", "failure"}:
            self._finalize_dungeon_turn_resolved(state=state, dungeon=dungeon, narration=narration, outcome=decision)

        updated = await self.store.update_session(
            session["id"],
            {"status": "awaiting_topic_dungeon", "active_agent": "dungeon_agent", "state": state},
        )
        payload = DungeonTurnPayload(
            narration=narration,
            decision_state=decision if decision in {"continue", "success", "failure"} else "continue",
            success_condition=dungeon.get("success_condition"),
            failure_condition=dungeon.get("failure_condition"),
            scenario_title=dungeon.get("scenario_title"),
            stakes_tier=dungeon.get("stakes_tier"),
        )
        return self._session_response(updated, message=narration, dungeon_turn=payload)

    def _finalize_dungeon_turn_resolved(
        self,
        *,
        state: dict[str, Any],
        dungeon: dict[str, Any],
        narration: str,
        outcome: str,
    ) -> None:
        """Keep session in dungeon until the learner dismisses; freeze further play."""
        dungeon["resolved"] = True
        dungeon["outcome"] = outcome
        dungeon["active"] = True

    async def _handle_dungeon_dismiss(self, session: dict[str, Any], turn: AgentTurnRequest) -> AgentSessionResponse:
        state = session["state"]
        if session["status"] != "awaiting_topic_dungeon":
            return self._session_response(session, message="There is nothing to dismiss.")
        dungeon = state.get("dungeon") or {}
        if not dungeon.get("resolved"):
            return self._session_response(
                session,
                message="The scenario is still active. Keep playing, or use **Leave scene** to exit early.",
            )
        state.pop("dungeon", None)
        self._set_conversation_phase(
            state,
            phase="followup",
            topic_id=self._current_topic(state).get("id"),
            awaiting_quiz_consent=True,
        )
        updated = await self.store.update_session(
            session["id"],
            {"status": "awaiting_topic_followup", "active_agent": "conversation_agent", "state": state},
        )
        return self._session_response(
            updated,
            message="You're back in your lesson thread. When you're ready, use **Start quiz** or ask a follow-up.",
        )

    async def _handle_dungeon_abort(self, session: dict[str, Any], turn: AgentTurnRequest) -> AgentSessionResponse:
        state = session["state"]
        if session["status"] != "awaiting_topic_dungeon":
            return self._session_response(session, message="There is no active Dungeon to leave.")
        dungeon = state.get("dungeon") or {}
        if dungeon.get("resolved"):
            return self._session_response(
                session,
                message="The scene has ended. Use **Complete** or **Exit** to return to your lesson.",
            )
        state.pop("dungeon", None)
        self._set_conversation_phase(
            state,
            phase="followup",
            topic_id=self._current_topic(state).get("id"),
            awaiting_quiz_consent=True,
        )
        updated = await self.store.update_session(
            session["id"],
            {"status": "awaiting_topic_followup", "active_agent": "conversation_agent", "state": state},
        )
        return self._session_response(
            updated,
            message="You step back out of the scene. When you are ready, use **Start quiz** or keep chatting about the topic.",
        )

    async def _handle_dungeon_text_turn(self, session: dict[str, Any], turn: AgentTurnRequest) -> AgentSessionResponse:
        state = session["state"]
        dungeon = state.get("dungeon") or {}
        if not dungeon.get("active"):
            return await self._handle_dungeon_abort(session, turn)

        if dungeon.get("resolved"):
            return self._session_response(
                session,
                message="The scenario is over. Tap **Complete** or **Exit** below the scene to return to your lesson.",
            )

        message = (turn.message or "").strip()
        if not message:
            return self._session_response(session, message="Describe what you do next.")

        dungeon.setdefault("buffer", [])
        dungeon["buffer"].append({"role": "user", "text": message})
        self._trim_dungeon_buffer(dungeon)

        context = self._build_dungeon_agent_context(session, state, dungeon, user_message=message, is_bootstrap=False)
        raw = await self.dungeon_agent.turn(context)
        narration = str(raw.get("narration") or "").strip() or "The tension holds—what now?"
        decision = str(raw.get("decision_state") or "continue").lower()
        if decision not in {"continue", "success", "failure"}:
            decision = "continue"

        dungeon["buffer"].append({"role": "assistant", "text": narration, "decision_state": decision})
        self._trim_dungeon_buffer(dungeon)

        payload = DungeonTurnPayload(
            narration=narration,
            decision_state=decision if decision in {"continue", "success", "failure"} else "continue",
            success_condition=dungeon.get("success_condition"),
            failure_condition=dungeon.get("failure_condition"),
            scenario_title=dungeon.get("scenario_title"),
            stakes_tier=dungeon.get("stakes_tier"),
        )

        if decision in {"success", "failure"}:
            self._finalize_dungeon_turn_resolved(
                state=state,
                dungeon=dungeon,
                narration=narration,
                outcome=decision,
            )
            updated = await self.store.update_session(
                session["id"],
                {"status": "awaiting_topic_dungeon", "active_agent": "dungeon_agent", "state": state},
            )
            return self._session_response(updated, message=narration.strip(), dungeon_turn=payload)

        updated = await self.store.update_session(
            session["id"],
            {"status": "awaiting_topic_dungeon", "active_agent": "dungeon_agent", "state": state},
        )
        return self._session_response(updated, message=narration, dungeon_turn=payload)
