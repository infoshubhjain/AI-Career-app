"""Session orchestration for roadmap generation, assessment, and lesson delivery."""

from __future__ import annotations

import uuid
from typing import Any

from app.core.logging import AgentLogger
from app.models.agent import AgentQuestion, AgentSessionResponse, AgentSessionStateResponse
from app.models.roadmap import RoadmapResponse
from agents.conversation_agent import ConversationAgent
from agents.knowledge_agent import KnowledgeAgent
from agents.memory_agent import MemoryCompactorAgent
from agents.roadmap import RoadmapAgent
from agents.runtime.types import AgentContext
from agents.tasker_agent import TaskerAgent
from services.agent_session_store import AgentSessionStore


PROFILE_QUESTIONS = [
    {"id": "reading_level", "prompt": "What is your reading level?", "kind": "profile"},
    {"id": "coding_confidence", "prompt": "How confident are you writing code from scratch?", "kind": "profile"},
    {"id": "math_comfort", "prompt": "How comfortable are you with math and logic-heavy problems?", "kind": "profile"},
]


class LearningOrchestrator:
    """Coordinates roadmap, assessment, lessons, quizzes, and memory snapshots."""

    def __init__(self) -> None:
        self.roadmap_agent = RoadmapAgent()
        self.knowledge_agent = KnowledgeAgent()
        self.tasker_agent = TaskerAgent()
        self.conversation_agent = ConversationAgent()
        self.memory_agent = MemoryCompactorAgent()
        self.store = AgentSessionStore()

    async def create_session(self, *, user_id: str, query: str) -> AgentSessionResponse:
        roadmap = await self.roadmap_agent.generate(query=query)
        session_id = str(uuid.uuid4())
        state = self._initial_state(roadmap=roadmap)
        first_question = PROFILE_QUESTIONS[0]["prompt"]

        payload = {
            "id": session_id,
            "user_id": user_id,
            "query": query,
            "status": "awaiting_profile",
            "active_agent": "knowledge_agent",
            "roadmap_json": roadmap.model_dump(),
            "state": state,
        }
        await self.store.create_session(payload)
        await self.store.append_event(
            {
                "session_id": session_id,
                "role": "system",
                "agent": "orchestrator",
                "event_type": "session_created",
                "payload": {"query": query},
            }
        )
        AgentLogger.info(event="session_created", component="orchestrator", session_id=session_id, user_id=user_id)
        return AgentSessionResponse(
            session_id=session_id,
            user_id=user_id,
            status="awaiting_profile",
            active_agent="knowledge_agent",
            message=f"Roadmap generated. I’ll calibrate your starting point before teaching. First question: {first_question}",
            roadmap=roadmap,
            pending_questions=[],
            state=state,
        )

    async def get_session(self, session_id: str) -> AgentSessionStateResponse:
        session = await self.store.get_session(session_id)
        return AgentSessionStateResponse(
            session_id=session["id"],
            user_id=session["user_id"],
            status=session["status"],
            active_agent=session["active_agent"],
            roadmap=RoadmapResponse(**session["roadmap_json"]),
            state=session["state"],
        )

    async def handle_user_message(self, *, session_id: str, user_id: str, message: str) -> AgentSessionResponse:
        session = await self.store.get_session(session_id)
        if session["user_id"] != user_id:
            raise ValueError("User does not match the active session")

        await self.store.append_event(
            {
                "session_id": session_id,
                "role": "user",
                "agent": session["active_agent"],
                "event_type": "user_message",
                "payload": {"message": message},
            }
        )

        status = session["status"]
        if status == "awaiting_profile":
            return await self._handle_profile(session, message)
        if status == "awaiting_knowledge_answer":
            return await self._handle_knowledge_turn(session, message)
        if status in {
            "teaching_topic",
            "awaiting_topic_followup",
            "awaiting_topic_quiz",
            "reviewing_topic",
            "awaiting_domain_quiz",
            "reviewing_domain",
        }:
            return await self._handle_conversation_turn(session, message)
        return await self._respond_from_terminal_state(session)

    async def _handle_profile(self, session: dict[str, Any], message: str) -> AgentSessionResponse:
        state = session["state"]
        onboarding = state.get("onboarding") or {"current_index": 0, "completed": False}
        current_index = int(onboarding.get("current_index", 0))
        question = PROFILE_QUESTIONS[current_index]
        state["profile_answers"].append(
            {
                "id": question["id"],
                "prompt": question["prompt"],
                "answer": message,
            }
        )

        AgentLogger.info(
            event="profile_answer_recorded",
            component="orchestrator",
            session_id=session["id"],
            question_id=question["id"],
            question_index=current_index,
        )

        if current_index + 1 < len(PROFILE_QUESTIONS):
            state["onboarding"] = {"current_index": current_index + 1, "completed": False}
            updated = await self.store.update_session(
                session["id"],
                {"status": "awaiting_profile", "active_agent": "knowledge_agent", "state": state},
            )
            next_question = PROFILE_QUESTIONS[current_index + 1]["prompt"]
            return AgentSessionResponse(
                session_id=updated["id"],
                user_id=updated["user_id"],
                status=updated["status"],
                active_agent=updated["active_agent"],
                message=f"Next question: {next_question}",
                roadmap=RoadmapResponse(**updated["roadmap_json"]),
                pending_questions=[],
                state=updated["state"],
            )

        state["onboarding"] = {"current_index": current_index, "completed": True}
        self._initialize_calibration(state, session["roadmap_json"])
        pending_skill = self._current_calibration_skill(state, session["roadmap_json"])
        context = AgentContext(
            session_id=session["id"],
            user_id=session["user_id"],
            user_message="Generate the first technical calibration question from the completed onboarding answers.",
            state={**state, "mode": "generate_probe", "target_skill": pending_skill},
            metadata={"stage": "knowledge_probe_generation"},
        )
        decision = await self.knowledge_agent.assess(context)
        patch = self._merge_state(state, decision.state_patch)
        self._set_progress_from_skill(patch, pending_skill, session["roadmap_json"])
        updated = await self.store.update_session(
            session["id"],
            {"status": "awaiting_knowledge_answer", "active_agent": "knowledge_agent", "state": patch},
        )
        return AgentSessionResponse(
            session_id=updated["id"],
            user_id=updated["user_id"],
            status=updated["status"],
            active_agent=updated["active_agent"],
            message=decision.message or "Answer this technical question so I can assess your starting point.",
            roadmap=RoadmapResponse(**updated["roadmap_json"]),
            pending_questions=[],
            state=updated["state"],
        )

    async def _handle_knowledge_turn(self, session: dict[str, Any], message: str) -> AgentSessionResponse:
        state = session["state"]
        target_skill = self._current_calibration_skill(state, session["roadmap_json"])
        context = AgentContext(
            session_id=session["id"],
            user_id=session["user_id"],
            user_message=message,
            state={**state, "mode": "assess_answer", "target_skill": target_skill},
            metadata={"stage": "knowledge_assessment"},
        )
        decision = await self.knowledge_agent.assess(context)
        next_state = self._merge_state(state, decision.state_patch)

        if decision.status == "awaiting_user":
            updated = await self.store.update_session(
                session["id"],
                {"status": "awaiting_knowledge_answer", "active_agent": "knowledge_agent", "state": next_state},
            )
            return AgentSessionResponse(
                session_id=updated["id"],
                user_id=updated["user_id"],
                status=updated["status"],
                active_agent=updated["active_agent"],
                message=decision.message,
                roadmap=RoadmapResponse(**updated["roadmap_json"]),
                pending_questions=[],
                state=updated["state"],
            )

        assessment = str(decision.metadata.get("assessment", "")).strip().lower()
        calibration = self._ensure_calibration(next_state)

        if assessment == "mastered":
            calibration["phase"] = "forward"
            calibration["last_mastered_index"] = calibration["current_index"]
            calibration["visited_indices"] = self._append_unique(calibration.get("visited_indices"), calibration["current_index"])
            next_index = calibration["current_index"] + 1
            ordered_skills = self._ordered_skills(session["roadmap_json"])
            if next_index >= len(ordered_skills):
                next_state["knowledge_state"]["learning_frontier"] = None
                updated = await self.store.update_session(
                    session["id"],
                    {"status": "completed", "active_agent": "conversation_agent", "state": next_state},
                )
                return AgentSessionResponse(
                    session_id=updated["id"],
                    user_id=updated["user_id"],
                    status=updated["status"],
                    active_agent=updated["active_agent"],
                    message="You appear comfortable across the full roadmap. Placeholder: capstone evaluation and advanced specialization flow will attach here.",
                    roadmap=RoadmapResponse(**updated["roadmap_json"]),
                    pending_questions=[],
                    state=updated["state"],
                )

            calibration["current_index"] = next_index
            next_skill = self._skill_from_absolute_index(session["roadmap_json"], next_index)
            self._set_progress_from_skill(next_state, next_skill, session["roadmap_json"])
            probe = await self._request_knowledge_probe(session, next_state, next_skill)
            updated = await self.store.update_session(
                session["id"],
                {"status": "awaiting_knowledge_answer", "active_agent": "knowledge_agent", "state": probe["state"]},
            )
            return AgentSessionResponse(
                session_id=updated["id"],
                user_id=updated["user_id"],
                status=updated["status"],
                active_agent=updated["active_agent"],
                message=f"{decision.message}\n\nNext checkpoint: {probe['message']}",
                roadmap=RoadmapResponse(**updated["roadmap_json"]),
                pending_questions=[],
                state=updated["state"],
            )

        frontier = next_state.get("knowledge_state", {}).get("learning_frontier")
        if assessment == "frontier" and calibration["phase"] == "anchor" and calibration["anchor_index"] > 0:
            next_state["knowledge_state"]["learning_frontier"] = None
            calibration["phase"] = "backfill"
            calibration["current_index"] = calibration["backtrack_index"]
            backfill_skill = self._skill_from_absolute_index(session["roadmap_json"], calibration["current_index"])
            self._set_progress_from_skill(next_state, backfill_skill, session["roadmap_json"])
            probe = await self._request_knowledge_probe(session, next_state, backfill_skill)
            updated = await self.store.update_session(
                session["id"],
                {"status": "awaiting_knowledge_answer", "active_agent": "knowledge_agent", "state": probe["state"]},
            )
            return AgentSessionResponse(
                session_id=updated["id"],
                user_id=updated["user_id"],
                status=updated["status"],
                active_agent=updated["active_agent"],
                message=(
                    f"{decision.message}\n\nThat anchor looks too advanced for your current level, so I’m stepping back to "
                    f"{backfill_skill['title']} to locate the right entry point more precisely.\n\n{probe['message']}"
                ),
                roadmap=RoadmapResponse(**updated["roadmap_json"]),
                pending_questions=[],
                state=updated["state"],
            )

        if not frontier:
            frontier = target_skill
            next_state["knowledge_state"]["learning_frontier"] = frontier

        if calibration["phase"] == "backfill" and calibration.get("last_mastered_index") is not None:
            frontier_index = calibration["last_mastered_index"] + 1
            frontier = self._skill_from_absolute_index(session["roadmap_json"], frontier_index)
            next_state["knowledge_state"]["learning_frontier"] = frontier
            self._set_progress_from_skill(next_state, frontier, session["roadmap_json"])

        if not frontier:
            self._advance_skill_pointer(next_state, session["roadmap_json"])
            next_skill = self._current_skill(next_state, session["roadmap_json"])
            updated = await self.store.update_session(
                session["id"],
                {"status": "awaiting_knowledge_answer", "active_agent": "knowledge_agent", "state": next_state},
            )
            return AgentSessionResponse(
                session_id=updated["id"],
                user_id=updated["user_id"],
                status=updated["status"],
                active_agent=updated["active_agent"],
                message="You look comfortable with that skill. Here is the next checkpoint question.",
                roadmap=RoadmapResponse(**updated["roadmap_json"]),
                pending_questions=[
                    AgentQuestion(
                        id=f"probe_{next_skill['id']}",
                        prompt=f"Explain or implement the core idea behind {next_skill['title']}.",
                        skill_id=next_skill["id"],
                        kind="knowledge_probe",
                    )
                ],
                state=updated["state"],
            )

        lesson_plan = await self._build_lesson_plan(session, next_state, frontier)
        next_state["current_topic_index"] = 0
        next_state["lesson_plan"] = lesson_plan
        updated = await self.store.update_session(
            session["id"],
            {"status": "teaching_topic", "active_agent": "conversation_agent", "state": next_state},
        )
        return await self._deliver_current_topic(updated, intro=decision.message)

    async def _build_lesson_plan(self, session: dict[str, Any], state: dict[str, Any], frontier: dict[str, Any]) -> list[dict[str, Any]]:
        context = AgentContext(
            session_id=session["id"],
            user_id=session["user_id"],
            user_message=f"Break down the skill '{frontier['title']}' into lecture-sized concepts.",
            state={**state, "target_skill": frontier},
            metadata={"stage": "task_decomposition"},
        )
        decision = await self.tasker_agent.build_plan(context)
        lesson_plan = decision.state_patch.get("lesson_plan") or []
        if lesson_plan:
            return lesson_plan
        return [{"id": f"{frontier['id']}-concept-1", "title": frontier["title"], "objective": frontier.get("description", "Learn the core concept")}]

    async def _handle_conversation_turn(self, session: dict[str, Any], message: str) -> AgentSessionResponse:
        state = session["state"]
        status = session["status"]

        if status == "teaching_topic":
            updated = await self.store.update_session(
                session["id"],
                {"status": "awaiting_topic_followup", "active_agent": "conversation_agent", "state": state},
            )
            return AgentSessionResponse(
                session_id=updated["id"],
                user_id=updated["user_id"],
                status=updated["status"],
                active_agent=updated["active_agent"],
                message="Ask any follow-up questions on this topic, or say 'ready' to take the quiz.",
                roadmap=RoadmapResponse(**updated["roadmap_json"]),
                state=updated["state"],
            )

        if status == "awaiting_topic_followup" and message.strip().lower() != "ready":
            return await self._answer_followup(session, message)

        if status == "awaiting_topic_followup":
            question = self._topic_quiz_question(state)
            updated = await self.store.update_session(
                session["id"],
                {"status": "awaiting_topic_quiz", "active_agent": "conversation_agent", "state": state},
            )
            return AgentSessionResponse(
                session_id=updated["id"],
                user_id=updated["user_id"],
                status=updated["status"],
                active_agent=updated["active_agent"],
                message="Quick check before moving on.",
                roadmap=RoadmapResponse(**updated["roadmap_json"]),
                pending_questions=[question],
                state=updated["state"],
            )

        if status == "awaiting_topic_quiz":
            return await self._grade_topic_quiz(session, message)

        if status == "reviewing_topic":
            return await self._deliver_current_topic(session, intro="Reviewing the topic you missed before re-quizzing you.")

        if status == "awaiting_domain_quiz":
            return await self._grade_domain_quiz(session, message)

        if status == "reviewing_domain":
            updated = await self.store.update_session(
                session["id"],
                {"status": "awaiting_domain_quiz", "active_agent": "conversation_agent", "state": session["state"]},
            )
            return AgentSessionResponse(
                session_id=updated["id"],
                user_id=updated["user_id"],
                status="awaiting_domain_quiz",
                active_agent="conversation_agent",
                message="Review the domain-level themes you struggled with, then answer the domain quiz again.",
                roadmap=RoadmapResponse(**updated["roadmap_json"]),
                pending_questions=[self._domain_quiz_question(updated["state"])],
                state=updated["state"],
            )

        return await self._respond_from_terminal_state(session)

    async def _answer_followup(self, session: dict[str, Any], message: str) -> AgentSessionResponse:
        state = session["state"]
        topic = self._current_topic(state)
        context = AgentContext(
            session_id=session["id"],
            user_id=session["user_id"],
            user_message=message,
            state={**state, "mode": "followup", "target_topic": topic},
            metadata={"stage": "conversation_followup"},
        )
        decision = await self.conversation_agent.respond(context)
        updated_state = self._merge_state(state, decision.state_patch)
        updated = await self.store.update_session(
            session["id"],
            {"status": "awaiting_topic_followup", "active_agent": "conversation_agent", "state": updated_state},
        )
        return AgentSessionResponse(
            session_id=updated["id"],
            user_id=updated["user_id"],
            status=updated["status"],
            active_agent=updated["active_agent"],
            message=decision.message,
            roadmap=RoadmapResponse(**updated["roadmap_json"]),
            state=updated["state"],
        )

    async def _grade_topic_quiz(self, session: dict[str, Any], message: str) -> AgentSessionResponse:
        state = session["state"]
        lowered = message.lower()
        correct = any(word in lowered for word in ("correct", "because", "example", "step", "function"))
        if not correct:
            updated = await self.store.update_session(
                session["id"],
                {"status": "reviewing_topic", "active_agent": "conversation_agent", "state": state},
            )
            return AgentSessionResponse(
                session_id=updated["id"],
                user_id=updated["user_id"],
                status=updated["status"],
                active_agent=updated["active_agent"],
                message="That answer is not strong enough yet. I am sending you back through a focused review before we retry the quiz.",
                roadmap=RoadmapResponse(**updated["roadmap_json"]),
                state=updated["state"],
            )

        state["current_topic_index"] += 1
        if state["current_topic_index"] < len(state.get("lesson_plan", [])):
            updated = await self.store.update_session(
                session["id"],
                {"status": "teaching_topic", "active_agent": "conversation_agent", "state": state},
            )
            return await self._deliver_current_topic(updated, intro="That was correct. Moving to the next concept.")

        await self._compact_memory(session, state)
        completion = self._advance_after_skill(session, state)
        updated = await self.store.update_session(
            session["id"],
            {"status": completion["status"], "active_agent": completion["active_agent"], "state": completion["state"]},
        )
        return AgentSessionResponse(
            session_id=updated["id"],
            user_id=updated["user_id"],
            status=updated["status"],
            active_agent=updated["active_agent"],
            message=completion["message"],
            roadmap=RoadmapResponse(**updated["roadmap_json"]),
            pending_questions=completion.get("pending_questions", []),
            state=updated["state"],
        )

    async def _grade_domain_quiz(self, session: dict[str, Any], message: str) -> AgentSessionResponse:
        state = session["state"]
        lowered = message.lower()
        correct = any(word in lowered for word in ("pattern", "tradeoff", "design", "because", "example"))
        if not correct:
            updated = await self.store.update_session(
                session["id"],
                {"status": "reviewing_domain", "active_agent": "conversation_agent", "state": state},
            )
            return AgentSessionResponse(
                session_id=updated["id"],
                user_id=updated["user_id"],
                status=updated["status"],
                active_agent=updated["active_agent"],
                message="The domain answer is still shallow. Review the full domain once more and then retry the assessment.",
                roadmap=RoadmapResponse(**updated["roadmap_json"]),
                state=updated["state"],
            )

        self._initialize_calibration(state, session["roadmap_json"], domain_only=True)
        next_skill = self._current_calibration_skill(state, session["roadmap_json"])
        probe = await self._request_knowledge_probe(session, state, next_skill)
        state["pending_domain_review"] = None
        updated = await self.store.update_session(
            session["id"],
            {"status": "awaiting_knowledge_answer", "active_agent": "knowledge_agent", "state": probe["state"]},
        )
        return AgentSessionResponse(
            session_id=updated["id"],
            user_id=updated["user_id"],
            status=updated["status"],
            active_agent=updated["active_agent"],
            message=f"Domain assessment passed. The knowledge agent is now calibrating your starting point in the next domain.\n\n{probe['message']}",
            roadmap=RoadmapResponse(**updated["roadmap_json"]),
            pending_questions=[],
            state=updated["state"],
        )

    async def _deliver_current_topic(self, session: dict[str, Any], *, intro: str | None = None) -> AgentSessionResponse:
        state = session["state"]
        topic = self._current_topic(state)
        context = AgentContext(
            session_id=session["id"],
            user_id=session["user_id"],
            user_message=f"Teach the topic '{topic['title']}' with practical examples and useful web resources.",
            state={**state, "mode": "teach_topic", "target_topic": topic},
            metadata={"stage": "topic_delivery"},
        )
        decision = await self.conversation_agent.respond(context)
        updated_state = self._merge_state(state, decision.state_patch)
        updated = await self.store.update_session(
            session["id"],
            {"status": "teaching_topic", "active_agent": "conversation_agent", "state": updated_state},
        )
        prefix = f"{intro}\n\n" if intro else ""
        return AgentSessionResponse(
            session_id=updated["id"],
            user_id=updated["user_id"],
            status=updated["status"],
            active_agent=updated["active_agent"],
            message=f"{prefix}{decision.message}".strip(),
            roadmap=RoadmapResponse(**updated["roadmap_json"]),
            state=updated["state"],
        )

    async def _compact_memory(self, session: dict[str, Any], state: dict[str, Any]) -> None:
        events = await self.store.list_events(session["id"], limit=25)
        context = AgentContext(
            session_id=session["id"],
            user_id=session["user_id"],
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
        return AgentSessionResponse(
            session_id=session["id"],
            user_id=session["user_id"],
            status=session["status"],
            active_agent=session["active_agent"],
            message="This session is complete for now. Placeholder: final capstone, certification guidance, and portfolio packaging will attach here.",
            roadmap=RoadmapResponse(**session["roadmap_json"]),
            state=session["state"],
        )

    def _initial_state(self, *, roadmap: RoadmapResponse) -> dict[str, Any]:
        ordered_skills = self._ordered_skills(roadmap.model_dump())
        return {
            "profile_answers": [],
            "onboarding": {"current_index": 0, "completed": False},
            "knowledge_state": {
                "skills": {},
                "learning_frontier": None,
                "current_probe": None,
                "calibration": {
                    "phase": "profile",
                    "anchor_index": 0,
                    "current_index": 0,
                    "backtrack_index": 0,
                    "last_mastered_index": None,
                    "visited_indices": [],
                    "total_skills": len(ordered_skills),
                },
            },
            "conversation_state": {"history": []},
            "roadmap_progress": {"domain_index": 0, "skill_index": 0},
            "lesson_plan": [],
            "current_topic_index": 0,
            "memory_summary": "",
            "completed_domains": [],
        }

    def _current_skill(self, state: dict[str, Any], roadmap_json: dict[str, Any]) -> dict[str, Any]:
        roadmap = RoadmapResponse(**roadmap_json)
        domain_index = state["roadmap_progress"]["domain_index"]
        skill_index = state["roadmap_progress"]["skill_index"]
        domain = roadmap.domains[domain_index]
        skill = domain.subdomains[skill_index]
        return {
            "domain_id": domain.id,
            "domain_title": domain.title,
            "id": skill.id,
            "title": skill.title,
            "description": skill.description,
            "order": skill.order,
        }

    def _ordered_skills(self, roadmap_json: dict[str, Any]) -> list[dict[str, Any]]:
        roadmap = RoadmapResponse(**roadmap_json)
        ordered: list[dict[str, Any]] = []
        for domain_index, domain in enumerate(roadmap.domains):
            for skill_index, skill in enumerate(domain.subdomains or []):
                ordered.append(
                    {
                        "absolute_index": len(ordered),
                        "domain_index": domain_index,
                        "skill_index": skill_index,
                        "domain_id": domain.id,
                        "domain_title": domain.title,
                        "id": skill.id,
                        "title": skill.title,
                        "description": skill.description,
                        "order": skill.order,
                    }
                )
        return ordered

    def _skill_from_absolute_index(self, roadmap_json: dict[str, Any], absolute_index: int) -> dict[str, Any]:
        ordered = self._ordered_skills(roadmap_json)
        if not ordered:
            raise ValueError("Roadmap does not contain any skills")
        bounded_index = max(0, min(absolute_index, len(ordered) - 1))
        return ordered[bounded_index]

    def _current_calibration_skill(self, state: dict[str, Any], roadmap_json: dict[str, Any]) -> dict[str, Any]:
        calibration = self._ensure_calibration(state)
        return self._skill_from_absolute_index(roadmap_json, calibration["current_index"])

    def _current_topic(self, state: dict[str, Any]) -> dict[str, Any]:
        lesson_plan = state.get("lesson_plan") or []
        if not lesson_plan:
            return {"id": "placeholder-topic", "title": "Placeholder Topic", "objective": "No lesson plan available"}
        idx = min(state.get("current_topic_index", 0), len(lesson_plan) - 1)
        return lesson_plan[idx]

    def _topic_quiz_question(self, state: dict[str, Any]) -> AgentQuestion:
        topic = self._current_topic(state)
        return AgentQuestion(
            id=f"quiz_{topic['id']}",
            prompt=f"Short quiz: explain {topic['title']} in your own words and give one practical example.",
            skill_id=topic["id"],
            kind="topic_quiz",
        )

    def _domain_quiz_question(self, state: dict[str, Any]) -> AgentQuestion:
        review = state.get("pending_domain_review") or {}
        domain_title = review.get("title", "this domain")
        domain_id = review.get("id")
        return AgentQuestion(
            id=f"domain_quiz_{domain_id or 'review'}",
            prompt=f"Domain quiz: summarize the key patterns, tradeoffs, and practical applications from {domain_title}.",
            skill_id=domain_id,
            kind="domain_quiz",
        )

    def _merge_state(self, base: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
        merged = dict(base)
        for key, value in patch.items():
            if isinstance(value, dict) and isinstance(merged.get(key), dict):
                merged[key] = self._merge_state(merged[key], value)
            else:
                merged[key] = value
        return merged

    def _ensure_calibration(self, state: dict[str, Any]) -> dict[str, Any]:
        knowledge_state = state.setdefault("knowledge_state", {})
        calibration = knowledge_state.setdefault("calibration", {})
        calibration.setdefault("phase", "profile")
        calibration.setdefault("anchor_index", 0)
        calibration.setdefault("current_index", 0)
        calibration.setdefault("backtrack_index", 0)
        calibration.setdefault("last_mastered_index", None)
        calibration.setdefault("visited_indices", [])
        calibration.setdefault("total_skills", 0)
        return calibration

    def _set_progress_from_skill(self, state: dict[str, Any], skill: dict[str, Any], roadmap_json: dict[str, Any]) -> None:
        ordered = self._ordered_skills(roadmap_json)
        for item in ordered:
            if item["id"] == skill["id"]:
                state["roadmap_progress"] = {"domain_index": item["domain_index"], "skill_index": item["skill_index"]}
                return

    def _profile_signal_score(self, answers: list[dict[str, Any]]) -> int:
        score = 0
        for item in answers:
            answer = str(item.get("answer", "")).lower()
            if any(word in answer for word in ("advanced", "expert", "professional", "very confident", "strong")):
                score += 2
            elif any(word in answer for word in ("intermediate", "somewhat", "okay", "comfortable", "moderate")):
                score += 1
            elif any(word in answer for word in ("beginner", "basic", "new", "low", "not confident")):
                score += 0
            elif answer.strip():
                score += 1
        return score

    def _initialize_calibration(self, state: dict[str, Any], roadmap_json: dict[str, Any], *, domain_only: bool = False) -> None:
        ordered = self._ordered_skills(roadmap_json)
        if not ordered:
            return

        if domain_only:
            anchor_index = self._absolute_index_from_progress(state, roadmap_json)
        else:
            profile_score = self._profile_signal_score(state.get("profile_answers", []))
            if profile_score <= 1:
                anchor_index = 0
            elif profile_score <= 3:
                anchor_index = max(0, round((len(ordered) - 1) * 0.2))
            elif profile_score <= 5:
                anchor_index = max(0, round((len(ordered) - 1) * 0.4))
            else:
                anchor_index = max(0, round((len(ordered) - 1) * 0.55))

        backtrack_index = max(0, anchor_index // 2)
        calibration = self._ensure_calibration(state)
        calibration.update(
            {
                "phase": "anchor",
                "anchor_index": anchor_index,
                "current_index": anchor_index,
                "backtrack_index": backtrack_index,
                "last_mastered_index": None,
                "visited_indices": [],
                "total_skills": len(ordered),
            }
        )

        starting_skill = ordered[anchor_index]
        self._set_progress_from_skill(state, starting_skill, roadmap_json)
        AgentLogger.info(
            event="knowledge_calibration_initialized",
            component="orchestrator",
            anchor_index=anchor_index,
            backtrack_index=backtrack_index,
            starting_skill_id=starting_skill["id"],
        )

    def _absolute_index_from_progress(self, state: dict[str, Any], roadmap_json: dict[str, Any]) -> int:
        progress = state.get("roadmap_progress") or {"domain_index": 0, "skill_index": 0}
        for item in self._ordered_skills(roadmap_json):
            if item["domain_index"] == progress.get("domain_index") and item["skill_index"] == progress.get("skill_index"):
                return item["absolute_index"]
        return 0

    def _append_unique(self, items: Any, value: int) -> list[int]:
        values = list(items or [])
        if value not in values:
            values.append(value)
        return values

    async def _request_knowledge_probe(self, session: dict[str, Any], state: dict[str, Any], skill: dict[str, Any]) -> dict[str, Any]:
        context = AgentContext(
            session_id=session["id"],
            user_id=session["user_id"],
            user_message="Generate the next technical calibration question.",
            state={**state, "mode": "generate_probe", "target_skill": skill},
            metadata={"stage": "knowledge_probe_generation"},
        )
        decision = await self.knowledge_agent.assess(context)
        merged_state = self._merge_state(state, decision.state_patch)
        self._set_progress_from_skill(merged_state, skill, session["roadmap_json"])
        return {"message": decision.message, "state": merged_state}

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

    def _advance_after_skill(self, session: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
        previous_domain_index = state["roadmap_progress"]["domain_index"]
        roadmap = RoadmapResponse(**session["roadmap_json"])
        completed_domain = roadmap.domains[previous_domain_index]
        self._advance_skill_pointer(state, session["roadmap_json"])
        progress = state["roadmap_progress"]

        if progress["domain_index"] >= len(roadmap.domains):
            return {
                "status": "completed",
                "active_agent": "conversation_agent",
                "state": state,
                "message": "You have completed the roadmap. Placeholder: capstone evaluation, domain-wide assessment, and endgame flow will go here.",
            }

        if progress["domain_index"] != previous_domain_index:
            state["pending_domain_review"] = {"id": completed_domain.id, "title": completed_domain.title}
            state["knowledge_state"]["learning_frontier"] = None
            state["knowledge_state"]["current_probe"] = None
            state["lesson_plan"] = []
            state["current_topic_index"] = 0
            return {
                "status": "awaiting_domain_quiz",
                "active_agent": "conversation_agent",
                "state": state,
                "message": f"You completed the domain '{completed_domain.title}'. Before moving on, take this short domain assessment.",
                "pending_questions": [self._domain_quiz_question(state)],
            }

        next_skill = self._current_skill(state, session["roadmap_json"])
        state["knowledge_state"]["learning_frontier"] = None
        state["knowledge_state"]["current_probe"] = None
        state["lesson_plan"] = []
        state["current_topic_index"] = 0
        self._initialize_calibration(state, session["roadmap_json"], domain_only=True)
        return {
            "status": "awaiting_knowledge_answer",
            "active_agent": "knowledge_agent",
            "state": state,
            "message": f"Skill complete. The knowledge agent is now checking your level for the next skill: {next_skill['title']}.",
            "pending_questions": [],
        }
