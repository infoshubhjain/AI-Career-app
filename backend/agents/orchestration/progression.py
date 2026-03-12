"""Progression and persistence helpers for orchestration."""

from __future__ import annotations

from typing import Any

from app.models.agent import AgentSessionResponse
from app.models.roadmap import RoadmapResponse


class ProgressionMixin:
    async def _persist_assistant_response(self, session: dict[str, Any], response: Any) -> None:
        await self.store.append_event(
            {
                "session_id": session["id"],
                "role": "assistant",
                "agent": response.active_agent,
                "event_type": "assistant_message",
                "content": response.message,
                "payload": {"status": response.status, "pending_questions": [question.model_dump() for question in response.pending_questions]},
            }
        )
        await self.store.update_project(
            session["project_id"],
            {"latest_session_id": session["id"], "status": "completed" if response.status == "completed" else "active"},
        )

    def _advance_skill_pointer(self, state: dict[str, Any], roadmap_json: dict[str, Any]) -> None:
        roadmap = RoadmapResponse(**roadmap_json)
        domain_index = state["roadmap_progress"]["domain_index"]
        skill_index = state["roadmap_progress"]["skill_index"] + 1
        if skill_index < len(roadmap.domains[domain_index].subdomains or []):
            state["roadmap_progress"]["skill_index"] = skill_index
            return
        if domain_index + 1 < len(roadmap.domains):
            state["roadmap_progress"]["domain_index"] = domain_index + 1
            state["roadmap_progress"]["skill_index"] = 0
            return
        state["roadmap_progress"]["domain_index"] = len(roadmap.domains)
        state["roadmap_progress"]["skill_index"] = 0

    async def _advance_after_skill(
        self,
        session: dict[str, Any],
        state: dict[str, Any],
        *,
        intro: str | None = None,
    ) -> AgentSessionResponse:
        previous_domain_index = state["roadmap_progress"]["domain_index"]
        roadmap = RoadmapResponse(**session["roadmap_json"])
        completed_domain = roadmap.domains[previous_domain_index]
        self._advance_skill_pointer(state, session["roadmap_json"])
        progress = state["roadmap_progress"]
        prefix = f"{intro}\n\n" if intro else ""

        if progress["domain_index"] >= len(roadmap.domains):
            self._set_conversation_phase(state, phase="completed", topic_id=None)
            updated = await self.store.update_session(
                session["id"],
                {"status": "completed", "active_agent": "conversation_agent", "state": state},
            )
            return self._session_response(
                updated,
                message=f"{prefix}You have completed the roadmap. Placeholder: capstone evaluation, domain-wide assessment, and endgame flow will go here.".strip(),
            )

        if progress["domain_index"] != previous_domain_index:
            state["pending_domain_review"] = {"id": completed_domain.id, "title": completed_domain.title}
            state["knowledge_state"]["learning_frontier"] = None
            state["knowledge_state"]["current_probe"] = None
            state["lesson_plan"] = []
            state["current_topic_index"] = 0
            state["skill_quiz_state"] = None
            quiz_bundle = await self._create_quiz(
                session=session,
                state=state,
                scope="domain_quiz",
                target_domain=state["pending_domain_review"],
                retry_reason="",
                user_message=f"Generate a domain quiz for {completed_domain.title}.",
            )
            updated = await self.store.update_session(
                session["id"],
                {"status": "awaiting_domain_quiz", "active_agent": "quiz_agent", "state": quiz_bundle["state"]},
            )
            return self._session_response(
                updated,
                message=f"{prefix}You completed the domain '{completed_domain.title}'. Before moving on, take this short domain assessment.".strip(),
                pending_questions=[quiz_bundle["question"]],
            )

        next_skill = self._current_skill(state, session["roadmap_json"])
        if state.get("learning_path_mode") == "beginning":
            return await self._start_guided_skill(
                session=session,
                state=state,
                intro=f"{prefix}Skill complete. Moving to the next skill: {next_skill['title']}.",
            )

        state["knowledge_state"]["learning_frontier"] = None
        state["knowledge_state"]["current_probe"] = None
        state["lesson_plan"] = []
        state["current_topic_index"] = 0
        state["skill_quiz_state"] = None
        current_index = self._absolute_index_from_progress(state, session["roadmap_json"])
        self._initialize_binary_placement(state, session["roadmap_json"], low_index=current_index)
        target_skill = self._placement_current_skill(state, session["roadmap_json"])
        quiz_bundle = await self._create_placement_quiz(
            session=session,
            state=state,
            target_skill=target_skill,
            prior_question=None,
            attempt_number=1,
        )
        updated = await self.store.update_session(
            session["id"],
            {"status": "awaiting_knowledge_answer", "active_agent": "quiz_agent", "state": quiz_bundle["state"]},
        )
        return self._session_response(
            updated,
            message=f"{prefix}Skill complete. Next, a quick placement check will confirm the right starting point for {next_skill['title']}.".strip(),
            pending_questions=[quiz_bundle["question"]],
        )

    async def _start_guided_skill(
        self,
        *,
        session: dict[str, Any],
        state: dict[str, Any],
        intro: str | None = None,
    ) -> Any:
        skill = self._current_skill(state, session["roadmap_json"])
        self._set_progress_from_skill(state, skill, session["roadmap_json"])
        state["knowledge_state"]["learning_frontier"] = skill
        state["knowledge_state"]["current_probe"] = None
        state["knowledge_state"]["selection_reason"] = None
        state.setdefault("placement_state", {})["phase"] = "skipped"
        state["skill_quiz_state"] = None
        lesson_plan = await self._build_lesson_plan(session, state, skill)
        state["lesson_plan"] = lesson_plan
        state["current_topic_index"] = 0
        self._set_conversation_phase(state, phase="lecture", topic_id=(lesson_plan[0]["id"] if lesson_plan else None), awaiting_quiz_consent=False)
        updated = await self.store.update_session(
            session["id"],
            {"status": "reviewing_topic", "active_agent": "conversation_agent", "state": state},
        )
        return await self._deliver_current_topic(updated, intro=intro)
