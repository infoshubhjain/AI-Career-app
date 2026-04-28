"""Placement progression and shared orchestration response helpers."""

from __future__ import annotations

from typing import Any

from app.models.agent import (
    AgentEventResponse,
    AgentProjectSummary,
    AgentSessionResponse,
    AgentSessionStateResponse,
    DungeonTurnPayload,
    QuizOutcomeFeedback,
)


class PlacementFlowMixin:
    async def _handle_knowledge_turn(self, session: dict[str, Any], turn: Any) -> AgentSessionResponse:
        state = session["state"]
        quiz, selected_index = await self._resolve_quiz_submission(session, turn)
        is_correct = selected_index == int(quiz["correct_option_index"])
        current_probe = (state.get("knowledge_state") or {}).get("current_probe") or {}
        selected_label = self._selected_option_label(quiz, selected_index)
        placement_state = self._ensure_placement_state(state, session["roadmap_json"])
        bkt_result = await self.knowledge_store.apply_quiz_observation(
            user_id=str(session["user_id"]),
            project_id=str(session["project_id"]),
            session_id=str(session["id"]),
            quiz=quiz,
            attempt_id=None,
            is_correct=is_correct,
            selection_reason="binary_search",
            selection_score=None,
            override_p_learn=0.05,
            override_p_guess=0.25,
            override_p_slip=0.2,
        )
        if not bkt_result:
            raise ValueError("Knowledge probe is missing a skill_id and cannot update BKT state")
        posterior_after = float(bkt_result["posterior_after"])
        mastery_high = float(placement_state.get("mastery_high") or 0.85)
        mastery_low = float(placement_state.get("mastery_low") or 0.15)
        result_message = self._placement_feedback_message(
            skill_title=str(current_probe.get("skill_title") or quiz.get("skill_id") or "this skill"),
            is_correct=is_correct,
            posterior_before=float(bkt_result["posterior_before"]),
            posterior_after=posterior_after,
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
            selection_reason="binary_search",
            selection_score=None,
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
        state["last_quiz_correct"] = is_correct
        state["knowledge_state"]["current_probe"] = None
        placement_state["current_skill_attempts"] = int(placement_state.get("current_skill_attempts") or 0) + 1
        self._record_binary_placement_history(
            state=state,
            quiz=quiz,
            current_probe=current_probe,
            selected_label=selected_label,
            is_correct=is_correct,
            result=bkt_result,
        )

        if mastery_low < posterior_after < mastery_high:
            prior_question = {
                "prompt": quiz.get("prompt"),
                "focus": quiz.get("focus"),
                "concept_id": quiz.get("concept_id"),
            }
            placement_state["current_skill_history"] = self._append_unique(
                placement_state.get("current_skill_history"),
                prior_question,
            )[-4:]
            target_skill = self._placement_current_skill(state, session["roadmap_json"])
            quiz_bundle = await self._create_placement_quiz(
                session=session,
                state=state,
                target_skill=target_skill,
                prior_question=prior_question,
                attempt_number=int(placement_state.get("current_skill_attempts") or 1) + 1,
            )
            updated = await self.store.update_session(
                session["id"],
                {"status": "awaiting_knowledge_answer", "active_agent": "quiz_agent", "state": quiz_bundle["state"]},
            )
            return self._session_response(updated, message=f"{result_message}\n\n{quiz_bundle['message']}", pending_questions=[quiz_bundle["question"]])

        ordered = self._ordered_skills(session["roadmap_json"])
        current_index_value = placement_state.get("current_index")
        if current_index_value is None:
            current_index_value = current_probe.get("absolute_index") or 0
        current_index = int(current_index_value)
        if posterior_after >= mastery_high:
            placement_state["last_mastered_index"] = current_index
            placement_state["low_index"] = current_index + 1
        else:
            placement_state["last_unmastered_index"] = current_index
            placement_state["high_index"] = current_index - 1

        next_index = self._next_binary_index(placement_state)
        if next_index is None:
            return await self._finalize_binary_placement(session=session, state=state, intro=result_message)

        placement_state["current_index"] = next_index
        placement_state["current_skill_id"] = ordered[next_index]["id"]
        placement_state["current_skill_attempts"] = 0
        placement_state["current_skill_history"] = []
        target_skill = ordered[next_index]
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

    def _record_binary_placement_history(
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
        placement_state["phase"] = "binary_search"

    def _placement_feedback_message(self, *, skill_title: str, is_correct: bool, posterior_before: float, posterior_after: float, confidence: float) -> str:
        direction = "up" if posterior_after >= posterior_before else "down"
        percent = round(posterior_after * 100)
        confidence_percent = round(confidence * 100)
        if is_correct:
            return f"That moves your estimated mastery of `{skill_title}` {direction} to about {percent}%. I’ll use that signal to choose the next most revealing skill. Confidence is about {confidence_percent}%."
        return f"That lowers your estimated mastery of `{skill_title}` to about {percent}%. I’ll use that signal to probe the most informative neighboring skill next. Confidence is about {confidence_percent}%."

    def _next_binary_index(self, placement_state: dict[str, Any]) -> int | None:
        low_index = placement_state.get("low_index")
        high_index = placement_state.get("high_index")
        if low_index is None or high_index is None:
            return None
        if int(low_index) > int(high_index):
            return None
        return (int(low_index) + int(high_index)) // 2

    async def _finalize_binary_placement(self, *, session: dict[str, Any], state: dict[str, Any], intro: str) -> AgentSessionResponse:
        ordered = self._ordered_skills(session["roadmap_json"])
        placement_state = self._ensure_placement_state(state, session["roadmap_json"])
        placement_state["phase"] = "complete"
        last_mastered = placement_state.get("last_mastered_index")
        if last_mastered is None:
            frontier_index = 0
        else:
            frontier_index = min(int(last_mastered) + 1, len(ordered) - 1)
        placement_state["frontier_index"] = frontier_index
        frontier_skill = ordered[frontier_index]
        state.setdefault("knowledge_state", {})["learning_frontier"] = frontier_skill
        self._set_progress_from_skill(state, frontier_skill, session["roadmap_json"])
        lesson_plan = await self._build_lesson_plan(session, state, frontier_skill)
        state["lesson_plan"] = lesson_plan
        state["current_topic_index"] = 0
        focus_topic = lesson_plan[0] if lesson_plan else {"title": frontier_skill.get("title")}
        state["focus_reveal"] = {
            "topic_title": focus_topic.get("title") or frontier_skill.get("title"),
            "skill_title": frontier_skill.get("title"),
            "domain_title": frontier_skill.get("domain_title"),
        }
        self._set_conversation_phase(state, phase="focus_confirm", topic_id=focus_topic.get("id"), awaiting_quiz_consent=False)
        updated = await self.store.update_session(
            session["id"],
            {"status": "awaiting_focus_confirm", "active_agent": "orchestrator", "state": state},
        )
        return self._session_response(updated, message=intro)

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

    def _session_response(
        self,
        session: dict[str, Any],
        *,
        message: str,
        pending_questions: list[Any] | None = None,
        quiz_outcome_feedback: QuizOutcomeFeedback | None = None,
        dungeon_turn: DungeonTurnPayload | None = None,
    ) -> AgentSessionResponse:
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
            quiz_outcome_feedback=quiz_outcome_feedback,
            dungeon_turn=dungeon_turn,
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
