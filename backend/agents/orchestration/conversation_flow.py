"""Conversation-specific lesson, follow-up, and quiz consent flow."""

from __future__ import annotations

from typing import Any

from app.models.agent import AgentSessionResponse, AgentTurnRequest, QuizOutcomeFeedback
from agents.runtime.types import AgentContext


READY_FOR_QUIZ_RESPONSES = {"ready", "yes", "y", "quiz", "start quiz", "lets do the quiz", "let's do the quiz", "go ahead"}


class ConversationFlowMixin:
    def _current_topic(self, state: dict[str, Any]) -> dict[str, Any]:
        lesson_plan = state.get("lesson_plan") or []
        if not lesson_plan:
            return {"id": "placeholder-topic", "title": "Placeholder Topic", "objective": "No lesson plan available"}
        idx = min(state.get("current_topic_index", 0), len(lesson_plan) - 1)
        return lesson_plan[idx]

    def _set_conversation_phase(
        self,
        state: dict[str, Any],
        *,
        phase: str,
        topic_id: str | None = None,
        awaiting_quiz_consent: bool | None = None,
    ) -> None:
        conversation_state = state.setdefault("conversation_state", {})
        conversation_state["phase"] = phase
        if topic_id is not None:
            conversation_state["current_topic_id"] = topic_id
        if awaiting_quiz_consent is not None:
            conversation_state["awaiting_quiz_consent"] = awaiting_quiz_consent
        if phase == "topic_quiz":
            conversation_state["last_quiz_topic_id"] = topic_id

    def _is_ready_for_topic_quiz(self, message: str) -> bool:
        normalized = "".join(ch.lower() if ch.isalnum() or ch.isspace() else " " for ch in message).strip()
        normalized = " ".join(normalized.split())
        return normalized in READY_FOR_QUIZ_RESPONSES

    def _append_quiz_readiness_prompt(self, message: str) -> str:
        """Append only after the initial lecture; follow-ups use the model reply as-is."""
        prompt = (
            "When you are ready, use **Start quiz** at the bottom of the chat or type `ready` here. "
            "You can keep asking questions in this thread first."
        )
        normalized = message.strip()
        if not normalized:
            return prompt
        if "ready" in normalized.lower() and "quiz" in normalized.lower():
            return normalized
        return f"{normalized}\n\n{prompt}"

    async def _begin_topic_quiz_after_readiness(self, session: dict[str, Any]) -> AgentSessionResponse:
        topic = self._current_topic(session["state"])
        quiz_bundle = await self._create_quiz(
            session=session,
            state=session["state"],
            scope="topic_quiz",
            target_topic=topic,
            target_skill=self._current_skill(session["state"], session["roadmap_json"]),
            retry_reason="",
            user_message="Generate the topic quiz after the learner indicated readiness.",
        )
        final_state = quiz_bundle["state"]
        self._set_conversation_phase(final_state, phase="topic_quiz", topic_id=topic.get("id"), awaiting_quiz_consent=False)
        updated = await self.store.update_session(
            session["id"],
            {"status": "awaiting_topic_quiz", "active_agent": "quiz_agent", "state": final_state},
        )
        return self._session_response(
            updated,
            message="Great. Here is the quiz for this topic.",
            pending_questions=[quiz_bundle["question"]],
        )

    async def _begin_domain_quiz_after_review(self, session: dict[str, Any]) -> AgentSessionResponse:
        review = session["state"].get("pending_domain_review") or {}
        quiz_bundle = await self._create_quiz(
            session=session,
            state=session["state"],
            scope="domain_quiz",
            target_domain=review,
            retry_reason="The learner previously missed this domain-level check.",
            user_message="Generate a new domain quiz after review.",
        )
        updated = await self.store.update_session(
            session["id"],
            {"status": "awaiting_domain_quiz", "active_agent": "quiz_agent", "state": quiz_bundle["state"]},
        )
        return self._session_response(updated, message="Here is your next domain check.", pending_questions=[quiz_bundle["question"]])

    def _conversation_context_state(self, state: dict[str, Any], **extra: Any) -> dict[str, Any]:
        knowledge_state = state.get("knowledge_state") or {}
        conversation_state = state.get("conversation_state") or {}
        roadmap_progress = state.get("roadmap_progress") or {}
        frontier = knowledge_state.get("learning_frontier")

        context_state: dict[str, Any] = {
            "conversation_state": conversation_state,
            "roadmap_progress": roadmap_progress,
            "current_topic_index": state.get("current_topic_index", 0),
            "lesson_plan": state.get("lesson_plan") or [],
            "lesson_context": {
                "learning_frontier": frontier,
            },
        }
        context_state.update(extra)
        return context_state

    async def _build_lesson_plan(self, session: dict[str, Any], state: dict[str, Any], frontier: dict[str, Any]) -> list[dict[str, Any]]:
        context = AgentContext(
            session_id=session["id"],
            user_id=str(session["user_id"]),
            user_message=f"Break down the skill '{frontier['title']}' into lecture-sized concepts.",
            state={**state, "target_skill": frontier},
            metadata={"stage": "task_decomposition"},
        )
        decision = await self.tasker_agent.build_plan(context)
        lesson_plan = decision.state_patch.get("lesson_plan") or []
        if lesson_plan:
            return lesson_plan
        return [{"id": f"{frontier['id']}-concept-1", "title": frontier["title"], "objective": frontier.get("description", "Learn the core concept")}]

    async def _handle_conversation_turn(self, session: dict[str, Any], turn: AgentTurnRequest) -> AgentSessionResponse:
        message = (turn.message or "").strip()
        status = session["status"]

        if turn.input_mode == "dungeon_start":
            return await self._handle_dungeon_start(session, turn)
        if turn.input_mode == "dungeon_dismiss":
            return await self._handle_dungeon_dismiss(session, turn)
        if turn.input_mode == "dungeon_abort":
            return await self._handle_dungeon_abort(session, turn)

        if turn.input_mode == "quiz_ready":
            if status == "awaiting_topic_dungeon":
                return self._session_response(
                    session,
                    message="Finish or leave the Dungeon first. You can start the quiz once this scene ends.",
                )
            if status == "awaiting_topic_followup":
                conv = session["state"].get("conversation_state") or {}
                topic = self._current_topic(session["state"])
                current_tid = conv.get("current_topic_id")
                if not conv.get("awaiting_quiz_consent"):
                    return self._session_response(
                        session,
                        message="Keep exploring this topic in the chat. When you are ready, scroll down and tap **Start quiz**.",
                    )
                if current_tid and topic.get("id") and current_tid != topic.get("id"):
                    return self._session_response(session, message="Topic state is out of sync. Try reloading the session.")
                return await self._begin_topic_quiz_after_readiness(session)
            if status == "reviewing_domain":
                return await self._begin_domain_quiz_after_review(session)
            return self._session_response(
                session,
                message="No quiz can be started from this screen right now. Continue the lesson or answer the active quiz above.",
            )

        if status == "awaiting_topic_dungeon":
            return await self._handle_dungeon_text_turn(session, turn)

        if status == "reviewing_topic":
            return await self._deliver_current_topic(session, intro="Reviewing the topic you missed before re-quizzing you.")

        if status == "awaiting_topic_followup" and not self._is_ready_for_topic_quiz(message):
            return await self._answer_followup(session, message)

        if status == "awaiting_topic_followup":
            return await self._begin_topic_quiz_after_readiness(session)

        if status == "awaiting_topic_quiz":
            return await self._grade_topic_quiz(session, turn)

        if status == "awaiting_skill_quiz":
            return await self._grade_skill_quiz(session, turn)

        if status == "awaiting_domain_quiz":
            return await self._grade_domain_quiz(session, turn)

        if status == "reviewing_domain":
            if message.lower() != "ready":
                updated = await self.store.update_session(
                    session["id"],
                    {"status": "reviewing_domain", "active_agent": "conversation_agent", "state": session["state"]},
                )
                return self._session_response(
                    updated,
                    message="When you are ready for the domain check, scroll down and tap **Start quiz**, or type `ready`.",
                )

            return await self._begin_domain_quiz_after_review(session)

        return await self._respond_from_terminal_state(session)

    async def _answer_followup(self, session: dict[str, Any], message: str) -> AgentSessionResponse:
        state = session["state"]
        topic = self._current_topic(state)
        context = AgentContext(
            session_id=session["id"],
            user_id=str(session["user_id"]),
            user_message=message,
            state=self._conversation_context_state(state, mode="followup", target_topic=topic),
            metadata={"stage": "conversation_followup"},
        )
        decision = await self.conversation_agent.respond(context)
        updated_state = self._merge_state(state, decision.state_patch)
        self._set_conversation_phase(updated_state, phase="followup", topic_id=topic.get("id"), awaiting_quiz_consent=True)
        updated = await self.store.update_session(
            session["id"],
            {"status": "awaiting_topic_followup", "active_agent": "conversation_agent", "state": updated_state},
        )
        # Do not append quiz UI copy on follow-ups—the chat UI already surfaces Start quiz; let the model answer fully.
        return self._session_response(updated, message=(decision.message or "").strip())

    async def _grade_topic_quiz(self, session: dict[str, Any], turn: AgentTurnRequest) -> AgentSessionResponse:
        state = session["state"]
        quiz, selected_index = await self._resolve_quiz_submission(session, turn)
        is_correct = selected_index == int(quiz["correct_option_index"])
        feedback = await self._lesson_quiz_outcome_feedback(
            session=session,
            quiz=quiz,
            selected_index=selected_index,
            is_correct=is_correct,
        )
        bkt_result = (
            await self.knowledge_store.apply_quiz_observation(
                user_id=str(session["user_id"]),
                project_id=str(session["project_id"]),
                session_id=str(session["id"]),
                quiz=quiz,
                attempt_id=None,
                is_correct=is_correct,
                selection_reason="topic_quiz_outcome",
                selection_score=None,
            )
            if quiz.get("skill_id")
            else {}
        )
        attempt = await self._record_quiz_attempt(
            session,
            quiz,
            selected_index,
            is_correct,
            assessment=bkt_result.get("assessment") if bkt_result else None,
            confidence=bkt_result.get("confidence") if bkt_result else None,
            mastery_before=bkt_result.get("posterior_before") if bkt_result else None,
            mastery_after=bkt_result.get("posterior_after") if bkt_result else None,
            model_version=bkt_result.get("model_version") if bkt_result else None,
        )
        if bkt_result:
            await self.knowledge_store.create_observation(
                user_id=str(session["user_id"]),
                project_id=str(session["project_id"]),
                session_id=str(session["id"]),
                quiz=quiz,
                attempt_id=int(attempt["id"]),
                is_correct=is_correct,
                posterior_before=float(bkt_result["posterior_before"]),
                posterior_after=float(bkt_result["posterior_after"]),
                selection_reason="topic_quiz_outcome",
            )
            self._update_bkt_skill_history(
                state=state,
                quiz=quiz,
                selected_label=self._selected_option_label(quiz, selected_index),
                is_correct=is_correct,
                result=bkt_result,
            )
            await self._refresh_project_knowledge_state(session=session, state=state)
        state["active_quiz_id"] = None
        state["active_quiz_kind"] = None

        if not is_correct:
            self._set_conversation_phase(state, phase="review", topic_id=self._current_topic(state).get("id"), awaiting_quiz_consent=False)
            updated = await self.store.update_session(
                session["id"],
                {"status": "reviewing_topic", "active_agent": "conversation_agent", "state": state},
            )
            return await self._deliver_current_topic(
                updated,
                intro="Not quite—let’s review this topic again before the next quiz question.",
                quiz_outcome_feedback=feedback,
            )

        state["current_topic_index"] += 1
        if state["current_topic_index"] < len(state.get("lesson_plan", [])):
            self._set_conversation_phase(state, phase="lecture", topic_id=self._current_topic(state).get("id"), awaiting_quiz_consent=False)
            updated = await self.store.update_session(
                session["id"],
                {"status": "reviewing_topic", "active_agent": "conversation_agent", "state": state},
            )
            return await self._deliver_current_topic(
                updated,
                intro="Great—moving to the next concept.",
                quiz_outcome_feedback=feedback,
            )

        return await self._start_skill_quiz(
            session=session,
            state=state,
            intro="You’ve finished the lesson topics for this skill. Next is a short skill check.",
            quiz_outcome_feedback=feedback,
        )

    async def _start_skill_quiz(
        self,
        *,
        session: dict[str, Any],
        state: dict[str, Any],
        intro: str | None = None,
        quiz_outcome_feedback: QuizOutcomeFeedback | None = None,
    ) -> AgentSessionResponse:
        skill = self._current_skill(state, session["roadmap_json"])
        total_questions = min(max(len(state.get("lesson_plan") or []), 3), 5)
        skill_quiz_state = {
            "skill_id": skill["id"],
            "skill_title": skill["title"],
            "total_questions": total_questions,
            "answered_questions": 0,
            "correct_answers": 0,
        }
        state["skill_quiz_state"] = skill_quiz_state
        quiz_bundle = await self._create_quiz(
            session=session,
            state=state,
            scope="skill_quiz",
            target_skill=skill,
            retry_reason="Create a broader end-of-skill assessment question that checks applied understanding across the lesson topics.",
            user_message=f"Generate skill assessment question 1 of {total_questions} for {skill['title']}.",
        )
        final_state = quiz_bundle["state"]
        final_state["skill_quiz_state"] = skill_quiz_state
        updated = await self.store.update_session(
            session["id"],
            {"status": "awaiting_skill_quiz", "active_agent": "quiz_agent", "state": final_state},
        )
        prefix = f"{intro}\n\n" if intro else ""
        return self._session_response(
            updated,
            message=f"{prefix}Skill check question 1 of {total_questions}.",
            pending_questions=[quiz_bundle["question"]],
            quiz_outcome_feedback=quiz_outcome_feedback,
        )

    async def _grade_skill_quiz(self, session: dict[str, Any], turn: AgentTurnRequest) -> AgentSessionResponse:
        state = session["state"]
        skill = self._current_skill(state, session["roadmap_json"])
        quiz, selected_index = await self._resolve_quiz_submission(session, turn)
        is_correct = selected_index == int(quiz["correct_option_index"])
        feedback = await self._lesson_quiz_outcome_feedback(
            session=session,
            quiz=quiz,
            selected_index=selected_index,
            is_correct=is_correct,
        )
        bkt_result = (
            await self.knowledge_store.apply_quiz_observation(
                user_id=str(session["user_id"]),
                project_id=str(session["project_id"]),
                session_id=str(session["id"]),
                quiz=quiz,
                attempt_id=None,
                is_correct=is_correct,
                selection_reason="skill_quiz_outcome",
                selection_score=None,
            )
            if quiz.get("skill_id")
            else {}
        )
        attempt = await self._record_quiz_attempt(
            session,
            quiz,
            selected_index,
            is_correct,
            assessment=bkt_result.get("assessment") if bkt_result else None,
            confidence=bkt_result.get("confidence") if bkt_result else None,
            mastery_before=bkt_result.get("posterior_before") if bkt_result else None,
            mastery_after=bkt_result.get("posterior_after") if bkt_result else None,
            model_version=bkt_result.get("model_version") if bkt_result else None,
        )
        if bkt_result:
            await self.knowledge_store.create_observation(
                user_id=str(session["user_id"]),
                project_id=str(session["project_id"]),
                session_id=str(session["id"]),
                quiz=quiz,
                attempt_id=int(attempt["id"]),
                is_correct=is_correct,
                posterior_before=float(bkt_result["posterior_before"]),
                posterior_after=float(bkt_result["posterior_after"]),
                selection_reason="skill_quiz_outcome",
            )
            self._update_bkt_skill_history(
                state=state,
                quiz=quiz,
                selected_label=self._selected_option_label(quiz, selected_index),
                is_correct=is_correct,
                result=bkt_result,
            )
            await self._refresh_project_knowledge_state(session=session, state=state)

        state["active_quiz_id"] = None
        state["active_quiz_kind"] = None
        skill_quiz_state = dict(state.get("skill_quiz_state") or {})
        answered_questions = int(skill_quiz_state.get("answered_questions") or 0) + 1
        total_questions = int(skill_quiz_state.get("total_questions") or 3)
        correct_answers = int(skill_quiz_state.get("correct_answers") or 0) + (1 if is_correct else 0)
        skill_quiz_state.update(
            {
                "answered_questions": answered_questions,
                "correct_answers": correct_answers,
            }
        )
        state["skill_quiz_state"] = skill_quiz_state

        if answered_questions < total_questions:
            next_number = answered_questions + 1
            quiz_bundle = await self._create_quiz(
                session=session,
                state=state,
                scope="skill_quiz",
                target_skill=skill,
                retry_reason="Generate a different end-of-skill assessment question that covers a distinct part of the same skill.",
                user_message=f"Generate skill assessment question {next_number} of {total_questions} for {skill['title']}.",
            )
            final_state = quiz_bundle["state"]
            final_state["skill_quiz_state"] = skill_quiz_state
            updated = await self.store.update_session(
                session["id"],
                {"status": "awaiting_skill_quiz", "active_agent": "quiz_agent", "state": final_state},
            )
            lead = "Correct." if is_correct else "Not quite."
            return self._session_response(
                updated,
                message=f"{lead} Skill check question {next_number} of {total_questions}.",
                pending_questions=[quiz_bundle["question"]],
                quiz_outcome_feedback=feedback,
            )

        await self._compact_memory(session, state)
        state["skill_quiz_state"] = None
        return await self._advance_after_skill(
            session,
            state,
            intro=f"Skill check complete for {skill['title']}: {correct_answers}/{total_questions} correct.",
            quiz_outcome_feedback=feedback,
        )

    async def _grade_domain_quiz(self, session: dict[str, Any], turn: AgentTurnRequest) -> AgentSessionResponse:
        state = session["state"]
        quiz, selected_index = await self._resolve_quiz_submission(session, turn)
        is_correct = selected_index == int(quiz["correct_option_index"])
        feedback = await self._lesson_quiz_outcome_feedback(
            session=session,
            quiz=quiz,
            selected_index=selected_index,
            is_correct=is_correct,
        )
        await self._record_quiz_attempt(session, quiz, selected_index, is_correct)
        state["active_quiz_id"] = None
        state["active_quiz_kind"] = None

        if not is_correct:
            self._set_conversation_phase(state, phase="domain_review", topic_id=None, awaiting_quiz_consent=False)
            updated = await self.store.update_session(
                session["id"],
                {"status": "reviewing_domain", "active_agent": "conversation_agent", "state": state},
            )
            return self._session_response(
                updated,
                message="Review the domain-level patterns again, then say `ready` for a new quiz question.",
                quiz_outcome_feedback=feedback,
            )

        state["pending_domain_review"] = None
        if state.get("learning_path_mode") == "beginning":
            return await self._start_guided_skill(
                session=session,
                state=state,
                intro="Domain assessment passed. Starting the next domain.",
                quiz_outcome_feedback=feedback,
            )

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
            message=f"Domain assessment passed. {quiz_bundle['message']}",
            pending_questions=[quiz_bundle["question"]],
            quiz_outcome_feedback=feedback,
        )

    async def _deliver_current_topic(
        self,
        session: dict[str, Any],
        *,
        intro: str | None = None,
        quiz_outcome_feedback: QuizOutcomeFeedback | None = None,
    ) -> AgentSessionResponse:
        state = session["state"]
        topic = self._current_topic(state)
        self._set_conversation_phase(state, phase="lecture", topic_id=topic.get("id"), awaiting_quiz_consent=False)
        context = AgentContext(
            session_id=session["id"],
            user_id=str(session["user_id"]),
            user_message=f"Teach the topic '{topic['title']}' with practical examples and useful web resources.",
            state=self._conversation_context_state(state, mode="teach_topic", target_topic=topic),
            metadata={"stage": "topic_delivery"},
        )
        decision = await self.conversation_agent.respond(context)
        updated_state = self._merge_state(state, decision.state_patch)
        self._set_conversation_phase(updated_state, phase="awaiting_quiz_ready", topic_id=topic.get("id"), awaiting_quiz_consent=True)
        updated = await self.store.update_session(
            session["id"],
            {"status": "awaiting_topic_followup", "active_agent": "conversation_agent", "state": updated_state},
        )
        prefix = f"{intro}\n\n" if intro else ""
        body = self._append_quiz_readiness_prompt(f"{prefix}{decision.message}".strip())
        return self._session_response(
            updated,
            message=body.strip(),
            quiz_outcome_feedback=quiz_outcome_feedback,
        )

    async def _compact_memory(self, session: dict[str, Any], state: dict[str, Any]) -> None:
        events = await self.store.list_events(session["id"], limit=25)
        context = AgentContext(
            session_id=session["id"],
            user_id=str(session["user_id"]),
            user_message="Compact the completed topic history into durable memory.",
            state={**state, "recent_events": events},
            metadata={"stage": "memory_compaction"},
        )
        decision = await self.memory_agent.compact(context)
        summary = decision.state_patch.get("memory_summary", "")
        if summary:
            await self.store.create_memory(
                {"session_id": session["id"], "user_id": session["user_id"], "summary": summary, "scope": "skill"}
            )

    async def _respond_from_terminal_state(self, session: dict[str, Any]) -> AgentSessionResponse:
        return self._session_response(
            session,
            message="This session is complete for now. Placeholder: final capstone, certification guidance, and portfolio packaging will attach here.",
        )
