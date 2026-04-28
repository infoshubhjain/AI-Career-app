"""Quiz creation, retrieval, and persistence helpers for orchestration."""

from __future__ import annotations

from typing import Any

from app.core.logging import AgentLogger
from app.models.agent import AgentAnswerOption, AgentQuestion, QuizOutcomeFeedback
from agents.runtime.types import AgentContext

IDONT_KNOW_OPTION_ID = "IDK"
IDONT_KNOW_OPTION_LABEL = "I don't know"


class QuizRuntimeMixin:
    async def _pending_questions_for_session(self, session: dict[str, Any]) -> list[AgentQuestion]:
        if session["status"] == "awaiting_profile":
            return [self._reading_level_question()]
        active_quiz_id = (session.get("state") or {}).get("active_quiz_id")
        if not active_quiz_id:
            return []
        try:
            quiz = await self.store.get_quiz(active_quiz_id)
        except ValueError:
            return []
        return [self._quiz_to_question(quiz)]

    async def _refresh_project_knowledge_state(self, *, session: dict[str, Any], state: dict[str, Any]) -> list[dict[str, Any]]:
        ordered = self._ordered_skills(session["roadmap_json"])
        summaries = await self.knowledge_store.list_project_skill_summaries(
            user_id=str(session["user_id"]),
            project_id=str(session["project_id"]),
            ordered_skills=ordered,
        )
        frontier = self.knowledge_store.summarize_frontier(summaries)
        placement_state = self._ensure_placement_state(state, session["roadmap_json"])
        placement_state["frontier_index"] = frontier.get("absolute_index") if frontier else None
        state.setdefault("knowledge_state", {})["skill_probabilities_summary"] = summaries
        state["knowledge_state"]["learning_frontier"] = frontier
        return summaries

    async def _create_quiz(
        self,
        *,
        session: dict[str, Any],
        state: dict[str, Any],
        scope: str,
        user_message: str,
        target_skill: dict[str, Any] | None = None,
        target_topic: dict[str, Any] | None = None,
        target_domain: dict[str, Any] | None = None,
        retry_reason: str = "",
        placement_plan: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        prior_quiz = None
        if state.get("active_quiz_id"):
            try:
                prior_quiz = await self.store.get_quiz(state["active_quiz_id"])
            except ValueError:
                prior_quiz = None

        context = AgentContext(
            session_id=session["id"],
            user_id=str(session["user_id"]),
            user_message=user_message,
            state={
                **state,
                "quiz_scope": scope,
                "target_skill": target_skill,
                "target_topic": target_topic,
                "target_domain": target_domain,
                "retry_reason": retry_reason,
                "prior_quiz": prior_quiz,
                "placement_plan": placement_plan or {},
                "placement_state": self._placement_context_summary(state, session["roadmap_json"]),
                "placement_history": (state.get("placement_state") or {}).get("global_history") or [],
                "recent_question_fingerprints": (state.get("placement_state") or {}).get("recent_question_fingerprints") or [],
            },
            metadata={"stage": "quiz_generation", "scope": scope},
        )
        generated = await self.quiz_agent.generate(context)
        options = [
            AgentAnswerOption(id=option_id, label=label)
            for option_id, label in zip(("A", "B", "C", "D"), generated["options"])
        ]
        options.append(AgentAnswerOption(id=IDONT_KNOW_OPTION_ID, label=IDONT_KNOW_OPTION_LABEL))
        question_kind = str(generated.get("question_kind") or (placement_plan or {}).get("question_kind") or scope)
        attempt_number = int(generated.get("attempt_number") or (placement_plan or {}).get("attempt_number") or 1)
        quiz = await self.store.create_quiz(
            {
                "project_id": session["project_id"],
                "session_id": session["id"],
                "user_id": session["user_id"],
                "question_kind": question_kind,
                "source_agent": "quiz_agent",
                "skill_id": (target_skill or {}).get("id"),
                "domain_id": (target_domain or {}).get("id") or (target_skill or {}).get("domain_id"),
                "concept_id": generated.get("concept_id") or (placement_plan or {}).get("concept_id"),
                "difficulty": generated.get("difficulty") or (placement_plan or {}).get("difficulty") or None,
                "placement_stage": generated.get("placement_stage") or (placement_plan or {}).get("placement_stage"),
                "question_fingerprint": generated.get("question_fingerprint") or "",
                "attempt_number": attempt_number,
                "prompt": generated["prompt"],
                "options": [option.model_dump() for option in options],
                "correct_option_index": generated["correct_option_index"],
                "explanation": generated["explanation"],
                "focus": generated.get("focus", "") or str((placement_plan or {}).get("focus") or ""),
                "status": "active",
            }
        )
        updated_state = self._merge_state(
            state,
            {
                "active_quiz_id": quiz["id"],
                "active_quiz_kind": scope,
                "knowledge_state": {
                    "current_probe": {
                        "quiz_id": quiz["id"],
                        "skill_id": (target_skill or {}).get("id"),
                        "skill_title": (target_skill or {}).get("title"),
                        "absolute_index": (placement_plan or {}).get("absolute_index"),
                        "placement_stage": generated.get("placement_stage") or (placement_plan or {}).get("placement_stage"),
                        "difficulty": generated.get("difficulty") or (placement_plan or {}).get("difficulty"),
                        "concept_id": generated.get("concept_id") or (placement_plan or {}).get("concept_id"),
                        "prompt": quiz["prompt"],
                        "attempt_number": attempt_number,
                        "selection_reason": (placement_plan or {}).get("selection_reason"),
                        "selection_score": (placement_plan or {}).get("selection_score"),
                        "project_p_know": (placement_plan or {}).get("project_p_know"),
                        "global_p_know": (placement_plan or {}).get("global_p_know"),
                        "confidence": (placement_plan or {}).get("confidence"),
                    }
                    if scope == "knowledge_probe"
                    else state.get("knowledge_state", {}).get("current_probe"),
                },
            },
        )
        if scope == "topic_quiz":
            self._set_conversation_phase(updated_state, phase="topic_quiz", topic_id=(target_topic or {}).get("id"))
        elif scope == "skill_quiz":
            self._set_conversation_phase(updated_state, phase="skill_quiz", topic_id=None)
        elif scope == "domain_quiz":
            self._set_conversation_phase(updated_state, phase="domain_quiz", topic_id=None)
        elif scope == "knowledge_probe":
            self._set_conversation_phase(updated_state, phase="knowledge_quiz", topic_id=None)
        return {"message": generated["message"], "question": self._quiz_to_question(quiz), "state": updated_state}

    async def _create_placement_quiz(
        self,
        *,
        session: dict[str, Any],
        state: dict[str, Any],
        target_skill: dict[str, Any],
        prior_question: dict[str, Any] | None = None,
        attempt_number: int = 1,
    ) -> dict[str, Any]:
        context = AgentContext(
            session_id=session["id"],
            user_id=str(session["user_id"]),
            user_message=f"Generate a placement question for {target_skill.get('title') or 'this skill'}.",
            state={
                "quiz_scope": "placement_probe",
                "placement_mode": "binary_search",
                "target_skill": target_skill,
                "prior_question": prior_question or {},
                "attempt_number": attempt_number,
            },
            metadata={"stage": "placement_quiz_generation"},
        )
        generated = await self.quiz_agent.generate(context)
        options = [
            AgentAnswerOption(id=option_id, label=label)
            for option_id, label in zip(("A", "B", "C", "D"), generated["options"])
        ]
        options.append(AgentAnswerOption(id=IDONT_KNOW_OPTION_ID, label=IDONT_KNOW_OPTION_LABEL))
        quiz = await self.store.create_quiz(
            {
                "project_id": session["project_id"],
                "session_id": session["id"],
                "user_id": session["user_id"],
                "question_kind": "placement_probe",
                "source_agent": "quiz_agent",
                "skill_id": target_skill.get("id"),
                "domain_id": target_skill.get("domain_id"),
                "concept_id": generated.get("concept_id"),
                "difficulty": generated.get("difficulty") or "medium",
                "placement_stage": "placement_probe",
                "question_fingerprint": generated.get("question_fingerprint") or "",
                "attempt_number": int(generated.get("attempt_number") or attempt_number),
                "prompt": generated["prompt"],
                "options": [option.model_dump() for option in options],
                "correct_option_index": generated["correct_option_index"],
                "explanation": generated["explanation"],
                "focus": generated.get("focus", "") or "",
                "status": "active",
            }
        )
        updated_state = self._merge_state(
            state,
            {
                "active_quiz_id": quiz["id"],
                "active_quiz_kind": "placement_probe",
                "knowledge_state": {
                    "current_probe": {
                        "quiz_id": quiz["id"],
                        "skill_id": target_skill.get("id"),
                        "skill_title": target_skill.get("title"),
                        "absolute_index": target_skill.get("absolute_index"),
                        "placement_stage": "placement_probe",
                        "difficulty": generated.get("difficulty"),
                        "concept_id": generated.get("concept_id"),
                        "prompt": quiz["prompt"],
                        "attempt_number": int(generated.get("attempt_number") or attempt_number),
                    }
                },
            },
        )
        self._set_conversation_phase(updated_state, phase="knowledge_quiz", topic_id=None)
        return {"message": generated["message"], "question": self._quiz_to_question(quiz), "state": updated_state}

    def _quiz_to_question(self, quiz: dict[str, Any]) -> AgentQuestion:
        return AgentQuestion(
            id=quiz["id"],
            quiz_id=quiz["id"],
            prompt=quiz["prompt"],
            skill_id=quiz.get("skill_id"),
            domain_id=quiz.get("domain_id"),
            concept_id=quiz.get("concept_id"),
            correct_option_index=quiz.get("correct_option_index"),
            kind=quiz["question_kind"],
            options=[AgentAnswerOption(**option) for option in list(quiz.get("options") or [])],
            attempt_number=int(quiz.get("attempt_number") or 1),
            difficulty=quiz.get("difficulty"),
            placement_stage=quiz.get("placement_stage"),
        )

    async def _resolve_quiz_submission(self, session: dict[str, Any], turn: Any) -> tuple[dict[str, Any], int]:
        if turn.input_mode != "multiple_choice":
            raise ValueError("This step requires a multiple-choice answer")
        quiz_id = turn.question_id or session["state"].get("active_quiz_id")
        if not quiz_id:
            raise ValueError("No active quiz is available for this session")
        quiz = await self.store.get_quiz(quiz_id)
        if quiz["session_id"] != session["id"]:
            raise ValueError("Quiz does not belong to this session")
        selected_index = self._selected_index_from_turn(
            turn,
            [AgentAnswerOption(**option) for option in list(quiz.get("options") or [])],
        )
        return quiz, selected_index

    async def _record_quiz_attempt(
        self,
        session: dict[str, Any],
        quiz: dict[str, Any],
        selected_index: int,
        is_correct: bool,
        *,
        assessment: str | None = None,
        confidence: float | None = None,
        mastery_before: float | None = None,
        mastery_after: float | None = None,
        selection_score: float | None = None,
        model_version: str | None = None,
    ) -> dict[str, Any]:
        selected_option = self._selected_option_payload(quiz, selected_index)
        selected_option_id = str(selected_option.get("id") or "")
        selected_option_label = str(selected_option.get("label") or "")
        persisted_selected_index = selected_index
        if selected_option_id == IDONT_KNOW_OPTION_ID and selected_index > 3:
            # Older databases still enforce a 0..3 check constraint.
            # Keep the real choice in metadata so IDK answers do not crash the flow.
            persisted_selected_index = 3
        attempt = await self.store.create_quiz_attempt(
            {
                "quiz_id": quiz["id"],
                "project_id": session["project_id"],
                "session_id": session["id"],
                "user_id": session["user_id"],
                "skill_id": quiz.get("skill_id"),
                "selected_option_index": persisted_selected_index,
                "is_correct": is_correct,
                "assessment": assessment,
                "confidence": confidence,
                "posterior_before": mastery_before,
                "posterior_after": mastery_after,
                "selection_score": selection_score,
                "model_version": model_version,
                "mastery_before": mastery_before,
                "mastery_after": mastery_after,
                "metadata": {
                    "question_kind": quiz["question_kind"],
                    "selected_option_id": selected_option_id,
                    "selected_option_label": selected_option_label,
                    "selected_option_index_raw": selected_index,
                    "selected_option_index_persisted": persisted_selected_index,
                },
            }
        )
        await self.store.update_quiz(quiz["id"], {"status": "answered"})
        return attempt

    def _selected_index_from_turn(self, turn: Any, options: list[AgentAnswerOption]) -> int:
        idx = (
            turn.selected_option_index
            if turn.selected_option_index is not None
            else next((i for i, option in enumerate(options) if option.id == turn.selected_option_id), -1)
        )
        if idx < 0 or idx >= len(options):
            raise ValueError("Selected option is not valid for this question")
        return idx

    def _selected_option_label(self, quiz: dict[str, Any], index: int) -> str:
        return str(self._selected_option_payload(quiz, index).get("label", ""))

    def _selected_option_payload(self, quiz: dict[str, Any], index: int) -> dict[str, Any]:
        options = list(quiz.get("options") or [])
        if index < 0 or index >= len(options):
            return {}
        return dict(options[index] or {})

    def _slugify(self, value: str) -> str:
        pieces = [part for part in "".join(ch.lower() if ch.isalnum() else "-" for ch in value).split("-") if part]
        return "-".join(pieces[:6]) or "concept"

    async def _lesson_quiz_outcome_feedback(
        self,
        *,
        session: dict[str, Any],
        quiz: dict[str, Any],
        selected_index: int,
        is_correct: bool,
    ) -> QuizOutcomeFeedback | None:
        """LLM explanation for topic/skill/domain quizzes only (not placement/profile)."""
        kind = str(quiz.get("question_kind") or "")
        if kind not in {"topic_quiz", "skill_quiz", "domain_quiz"}:
            return None
        try:
            markdown = await self.quiz_agent.explain_outcome(
                quiz=quiz,
                selected_index=selected_index,
                is_correct=is_correct,
            )
        except Exception as exc:  # noqa: BLE001
            AgentLogger.error(
                event="quiz_outcome_explain_failed",
                component="quiz_runtime",
                session_id=str(session.get("id")),
                error=str(exc),
            )
            markdown = self.quiz_agent._fallback_outcome_explanation(quiz, is_correct)
        return QuizOutcomeFeedback(is_correct=is_correct, explanation_markdown=markdown)
