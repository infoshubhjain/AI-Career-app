"""Placement progression and shared orchestration response helpers."""

from __future__ import annotations

from typing import Any

from app.models.agent import AgentEventResponse, AgentProjectSummary, AgentSessionResponse, AgentSessionStateResponse


class PlacementFlowMixin:
    async def _handle_knowledge_turn(self, session: dict[str, Any], turn: Any) -> AgentSessionResponse:
        state = session["state"]
        quiz, selected_index = await self._resolve_quiz_submission(session, turn)
        is_correct = selected_index == int(quiz["correct_option_index"])
        current_probe = (state.get("knowledge_state") or {}).get("current_probe") or {}
        selected_label = self._selected_option_label(quiz, selected_index)
        bkt_result = await self.knowledge_store.apply_quiz_observation(
            user_id=str(session["user_id"]),
            project_id=str(session["project_id"]),
            session_id=str(session["id"]),
            quiz=quiz,
            attempt_id=None,
            is_correct=is_correct,
            selection_reason=str(current_probe.get("selection_reason") or ""),
            selection_score=current_probe.get("selection_score"),
        )
        if not bkt_result:
            raise ValueError("Knowledge probe is missing a skill_id and cannot update BKT state")
        result_message = self._placement_feedback_message(
            skill_title=str(current_probe.get("skill_title") or quiz.get("skill_id") or "this skill"),
            is_correct=is_correct,
            posterior_before=float(bkt_result["posterior_before"]),
            posterior_after=float(bkt_result["posterior_after"]),
            confidence=float(bkt_result["confidence"]),
        )
        attempt = await self._record_quiz_attempt(
            session,
            quiz,
            selected_index,
            is_correct,
            assessment=str(bkt_result["assessment"]),
            confidence=float(bkt_result["confidence"]),
            mastery_before=float(bkt_result["posterior_before"]),
            mastery_after=float(bkt_result["posterior_after"]),
            selection_score=current_probe.get("selection_score"),
            model_version=str(bkt_result["model_version"]),
        )
        await self.knowledge_store.create_observation(
            user_id=str(session["user_id"]),
            project_id=str(session["project_id"]),
            session_id=str(session["id"]),
            quiz=quiz,
            attempt_id=int(attempt["id"]),
            is_correct=is_correct,
            posterior_before=float(bkt_result["posterior_before"]),
            posterior_after=float(bkt_result["posterior_after"]),
            selection_reason=str(current_probe.get("selection_reason") or ""),
            selection_score=current_probe.get("selection_score"),
        )
        self._update_bkt_skill_history(
            state=state,
            quiz=quiz,
            selected_label=selected_label,
            is_correct=is_correct,
            result=bkt_result,
        )
        state["active_quiz_id"] = None
        state["active_quiz_kind"] = None
        state["knowledge_state"]["current_probe"] = None
        summaries = await self._refresh_project_knowledge_state(session=session, state=state)
        self._append_placement_history(
            state=state,
            quiz=quiz,
            current_probe=current_probe,
            selected_label=selected_label,
            is_correct=is_correct,
            result=bkt_result,
        )
        placement_state = self._ensure_placement_state(state, session["roadmap_json"])
        should_stop, stop_reason = self.knowledge_store.should_stop(
            summaries=summaries,
            question_budget_used=int(placement_state.get("question_budget_used") or 0),
            max_questions=int(placement_state.get("max_questions") or 6),
        )
        if should_stop:
            placement_state["stop_reason"] = stop_reason
            return await self._finalize_learning_frontier(session=session, state=state)

        quiz_bundle = await self._next_placement_probe(session=session, state=state, user_message=result_message)
        updated = await self.store.update_session(
            session["id"],
            {"status": "awaiting_knowledge_answer", "active_agent": "quiz_agent", "state": quiz_bundle["state"]},
        )
        return self._session_response(updated, message=f"{result_message}\n\n{quiz_bundle['message']}", pending_questions=[quiz_bundle["question"]])

    async def _finalize_learning_frontier(self, *, session: dict[str, Any], state: dict[str, Any]) -> AgentSessionResponse:
        summaries = await self._refresh_project_knowledge_state(session=session, state=state)
        frontier = self.knowledge_store.summarize_frontier(summaries)
        state.setdefault("placement_state", {})["phase"] = "complete"
        if frontier is None:
            updated = await self.store.update_session(session["id"], {"status": "completed", "active_agent": "conversation_agent", "state": state})
            return self._session_response(
                updated,
                message="You appear comfortable across the full roadmap. Placeholder: capstone evaluation and advanced specialization flow will attach here.",
            )

        state["knowledge_state"]["learning_frontier"] = frontier
        self._set_progress_from_skill(state, frontier, session["roadmap_json"])
        lesson_plan = await self._build_lesson_plan(session, state, frontier)
        state["lesson_plan"] = lesson_plan
        state["current_topic_index"] = 0
        self._set_conversation_phase(state, phase="review", topic_id=(lesson_plan[0]["id"] if lesson_plan else None))
        updated = await self.store.update_session(session["id"], {"status": "reviewing_topic", "active_agent": "conversation_agent", "state": state})
        return await self._deliver_current_topic(updated)

    def _update_bkt_skill_history(self, *, state: dict[str, Any], quiz: dict[str, Any], selected_label: str, is_correct: bool, result: dict[str, Any]) -> None:
        knowledge_state = state.setdefault("knowledge_state", {})
        skills = knowledge_state.setdefault("skills", {})
        skill_id = str(result.get("skill_id") or quiz.get("skill_id") or "")
        skill_state = dict(skills.get(skill_id, {}))
        asked_questions = list(skill_state.get("asked_questions") or [])
        answers = list(skill_state.get("answers") or [])
        question_fingerprints = list(skill_state.get("question_fingerprints") or [])
        if quiz.get("prompt"):
            asked_questions.append(str(quiz["prompt"]))
        fingerprint = str(quiz.get("question_fingerprint") or "")
        if fingerprint and fingerprint not in question_fingerprints:
            question_fingerprints.append(fingerprint)
        answers.append(
            {
                "question": quiz["prompt"],
                "answer": selected_label,
                "is_correct": is_correct,
                "assessment": result.get("assessment"),
                "confidence": result.get("confidence"),
                "posterior_before": result.get("posterior_before"),
                "posterior_after": result.get("posterior_after"),
            }
        )
        skill_state.update(
            {
                "attempts": int(skill_state.get("attempts", 0)) + 1,
                "status": result.get("assessment"),
                "asked_questions": asked_questions[-8:],
                "answers": answers[-8:],
                "mastery": result.get("posterior_after"),
                "confidence": result.get("confidence"),
                "question_fingerprints": question_fingerprints[-8:],
                "observation_count": result.get("observation_count"),
                "global_p_know": result.get("global_p_know"),
                "model_version": result.get("model_version"),
            }
        )
        skills[skill_id] = skill_state

    def _append_placement_history(
        self,
        *,
        state: dict[str, Any],
        quiz: dict[str, Any],
        current_probe: dict[str, Any],
        selected_label: str,
        is_correct: bool,
        result: dict[str, Any],
    ) -> None:
        placement_state = state.setdefault("placement_state", {})
        placement_state["question_budget_used"] = int(placement_state.get("question_budget_used", 0)) + 1
        placement_state["last_selected_skill_id"] = result.get("skill_id") or current_probe.get("skill_id")
        placement_state["last_selected_score"] = current_probe.get("selection_score")
        question_fingerprint = str(quiz.get("question_fingerprint") or "")
        if question_fingerprint:
            placement_state["recent_question_fingerprints"] = self._append_unique(placement_state.get("recent_question_fingerprints"), question_fingerprint)[-12:]
        history = list(placement_state.get("global_history") or [])
        history.append(
            {
                "skill_id": result.get("skill_id"),
                "skill_title": current_probe.get("skill_title"),
                "absolute_index": current_probe.get("absolute_index"),
                "assessment": result.get("assessment"),
                "confidence": result.get("confidence"),
                "selected_answer": selected_label,
                "is_correct": is_correct,
                "posterior_before": result.get("posterior_before"),
                "posterior_after": result.get("posterior_after"),
                "question_fingerprint": question_fingerprint,
            }
        )
        placement_state["global_history"] = history[-12:]
        placement_state["phase"] = "probing"

    def _placement_feedback_message(self, *, skill_title: str, is_correct: bool, posterior_before: float, posterior_after: float, confidence: float) -> str:
        direction = "up" if posterior_after >= posterior_before else "down"
        percent = round(posterior_after * 100)
        confidence_percent = round(confidence * 100)
        if is_correct:
            return f"That moves your estimated mastery of `{skill_title}` {direction} to about {percent}%. I’ll use that signal to choose the next most revealing skill. Confidence is about {confidence_percent}%."
        return f"That lowers your estimated mastery of `{skill_title}` to about {percent}%. I’ll use that signal to probe the most informative neighboring skill next. Confidence is about {confidence_percent}%."

    def _project_title(self, query: str) -> str:
        stripped = query.strip()
        if not stripped:
            return "Untitled Project"
        return " ".join(stripped.split()[:6])[:60]

    def _roadmap_label(self, roadmap_json: dict[str, Any], query: str) -> str:
        normalized_title = str(roadmap_json.get("normalized_title") or "").strip()
        source = normalized_title or query.strip()
        if not source:
            return "Untitled Roadmap"
        parts = [part for part in source.replace("-", " ").replace("_", " ").split() if part]
        if not parts:
            return "Untitled Roadmap"
        return " ".join(part.upper() if len(part) <= 3 else part.capitalize() for part in parts)[:80]

    def _project_summary(self, project: dict[str, Any], *, latest_session_status: str | None = None) -> AgentProjectSummary:
        return AgentProjectSummary(
            id=str(project["id"]),
            user_id=str(project["user_id"]),
            title=str(project["title"]),
            goal=str(project["goal"]),
            status=str(project["status"]),
            latest_session_id=str(project["latest_session_id"]) if project.get("latest_session_id") else None,
            latest_session_status=latest_session_status,
            created_at=str(project["created_at"]),
            updated_at=str(project["updated_at"]),
        )

    def _event_response(self, event: dict[str, Any]) -> AgentEventResponse:
        return AgentEventResponse(
            id=int(event["id"]),
            session_id=str(event["session_id"]),
            role=str(event["role"]),
            agent=str(event["agent"]),
            event_type=str(event["event_type"]),
            content=event.get("content"),
            payload=event.get("payload") or {},
            created_at=str(event["created_at"]),
        )

    def _merge_state(self, base: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
        merged = dict(base)
        for key, value in patch.items():
            if isinstance(value, dict) and isinstance(merged.get(key), dict):
                merged[key] = self._merge_state(merged[key], value)
            else:
                merged[key] = value
        return merged

    def _session_response(self, session: dict[str, Any], *, message: str, pending_questions: list[Any] | None = None) -> AgentSessionResponse:
        return AgentSessionResponse(
            session_id=str(session["id"]),
            project_id=str(session["project_id"]),
            user_id=str(session["user_id"]),
            status=str(session["status"]),
            active_agent=str(session["active_agent"]),
            message=message,
            roadmap=self._roadmap_response(session),
            pending_questions=pending_questions or [],
            state=session["state"],
        )

    def _session_state_response(self, session: dict[str, Any], *, pending_questions: list[Any] | None = None) -> AgentSessionStateResponse:
        return AgentSessionStateResponse(
            session_id=str(session["id"]),
            project_id=str(session["project_id"]),
            user_id=str(session["user_id"]),
            status=str(session["status"]),
            active_agent=str(session["active_agent"]),
            roadmap=self._roadmap_response(session),
            pending_questions=pending_questions or [],
            state=session["state"],
        )

    def _roadmap_response(self, session: dict[str, Any]):
        from app.models.roadmap import RoadmapResponse

        return RoadmapResponse(**session["roadmap_json"])
