"""Shared roadmap and BKT-backed placement state helpers for orchestration."""

from __future__ import annotations

from typing import Any

from app.models.agent import AgentAnswerOption, AgentQuestion
from app.models.roadmap import RoadmapResponse


READING_LEVEL_OPTIONS = [
    AgentAnswerOption(id="A", label="<5th Grade"),
    AgentAnswerOption(id="B", label="6-8th grade"),
    AgentAnswerOption(id="C", label="high school"),
    AgentAnswerOption(id="D", label="university"),
]


class CoreStateMixin:
    def _initial_state(self, *, roadmap: RoadmapResponse) -> dict[str, Any]:
        return {
            "learning_path_mode": None,
            "profile_answers": [],
            "learner_profile": {"reading_level": None},
            "onboarding": {"current_index": 0, "completed": False},
            "knowledge_state": {
                "skill_probabilities_summary": [],
                "learning_frontier": None,
                "current_probe": None,
                "selection_reason": None,
            },
            "placement_state": {
                "phase": "idle",
                "recent_question_fingerprints": [],
                "global_history": [],
                "last_selected_skill_id": None,
                "last_selected_score": None,
                "frontier_index": None,
                "stop_reason": None,
                "low_index": None,
                "high_index": None,
                "current_index": None,
                "current_skill_id": None,
                "current_skill_attempts": 0,
                "current_skill_history": [],
                "last_mastered_index": None,
                "last_unmastered_index": None,
                "mastery_high": 0.85,
                "mastery_low": 0.15,
            },
            "conversation_state": {
                "history": [],
                "phase": "idle",
                "current_topic_id": None,
                "last_quiz_topic_id": None,
                "awaiting_quiz_consent": False,
            },
            "roadmap_progress": {"domain_index": 0, "skill_index": 0},
            "lesson_plan": [],
            "current_topic_index": 0,
            "skill_quiz_state": None,
            "memory_summary": "",
            "completed_domains": [],
            "pending_domain_review": None,
            "active_quiz_id": None,
            "active_quiz_kind": None,
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

    def _ensure_placement_state(self, state: dict[str, Any], roadmap_json: dict[str, Any]) -> dict[str, Any]:
        placement_state = state.setdefault("placement_state", {})
        placement_state.setdefault("phase", "idle")
        placement_state.setdefault("recent_question_fingerprints", [])
        placement_state.setdefault("global_history", [])
        placement_state.setdefault("last_selected_skill_id", None)
        placement_state.setdefault("last_selected_score", None)
        placement_state.setdefault("frontier_index", None)
        placement_state.setdefault("stop_reason", None)
        placement_state.setdefault("low_index", None)
        placement_state.setdefault("high_index", None)
        placement_state.setdefault("current_index", None)
        placement_state.setdefault("current_skill_id", None)
        placement_state.setdefault("current_skill_attempts", 0)
        placement_state.setdefault("current_skill_history", [])
        placement_state.setdefault("last_mastered_index", None)
        placement_state.setdefault("last_unmastered_index", None)
        placement_state.setdefault("mastery_high", 0.85)
        placement_state.setdefault("mastery_low", 0.15)
        return placement_state

    def _initialize_binary_placement(
        self,
        state: dict[str, Any],
        roadmap_json: dict[str, Any],
        *,
        low_index: int | None = None,
        high_index: int | None = None,
    ) -> None:
        placement_state = self._ensure_placement_state(state, roadmap_json)
        ordered = self._ordered_skills(roadmap_json)
        if not ordered:
            raise ValueError("Roadmap does not contain any skills for placement")
        min_index = 0
        max_index = len(ordered) - 1
        bounded_low = max(min_index, int(low_index) if low_index is not None else min_index)
        bounded_high = min(max_index, int(high_index) if high_index is not None else max_index)
        if bounded_low > bounded_high:
            bounded_low = min_index
            bounded_high = max_index
        current_index = (bounded_low + bounded_high) // 2
        current_skill = ordered[current_index]
        placement_state.update(
            {
                "phase": "binary_search",
                "recent_question_fingerprints": [],
                "global_history": [],
                "last_selected_skill_id": None,
                "last_selected_score": None,
                "frontier_index": None,
                "stop_reason": None,
                "low_index": bounded_low,
                "high_index": bounded_high,
                "current_index": current_index,
                "current_skill_id": current_skill.get("id"),
                "current_skill_attempts": 0,
                "current_skill_history": [],
                "last_mastered_index": None,
                "last_unmastered_index": None,
                "mastery_high": placement_state.get("mastery_high", 0.85),
                "mastery_low": placement_state.get("mastery_low", 0.15),
            }
        )

    def _placement_current_skill(self, state: dict[str, Any], roadmap_json: dict[str, Any]) -> dict[str, Any]:
        placement_state = self._ensure_placement_state(state, roadmap_json)
        current_index = placement_state.get("current_index")
        if current_index is None:
            raise ValueError("Placement current index is not set")
        return self._skill_from_absolute_index(roadmap_json, int(current_index))

    def _placement_context_summary(self, state: dict[str, Any], roadmap_json: dict[str, Any]) -> dict[str, Any]:
        placement_state = self._ensure_placement_state(state, roadmap_json)
        history = list(placement_state.get("global_history") or [])
        skill_summary = list((state.get("knowledge_state") or {}).get("skill_probabilities_summary") or [])
        frontier = (state.get("knowledge_state") or {}).get("learning_frontier")
        return {
            "phase": placement_state.get("phase"),
            "stop_reason": placement_state.get("stop_reason"),
            "selection_policy": "binary_search_bkt",
            "frontier_index": placement_state.get("frontier_index"),
            "frontier": frontier,
            "last_selected_skill_id": placement_state.get("last_selected_skill_id"),
            "last_selected_score": placement_state.get("last_selected_score"),
            "low_index": placement_state.get("low_index"),
            "high_index": placement_state.get("high_index"),
            "current_index": placement_state.get("current_index"),
            "current_skill_id": placement_state.get("current_skill_id"),
            "last_mastered_index": placement_state.get("last_mastered_index"),
            "last_unmastered_index": placement_state.get("last_unmastered_index"),
            "recent_history": history[-4:],
            "skill_probability_summary": skill_summary[-8:],
        }

    def _reading_level_question(self) -> AgentQuestion:
        return AgentQuestion(
            id="reading_level",
            prompt="What is your reading level?",
            kind="profile",
            options=READING_LEVEL_OPTIONS,
            attempt_number=1,
        )

    def _set_progress_from_skill(self, state: dict[str, Any], skill: dict[str, Any], roadmap_json: dict[str, Any]) -> None:
        for item in self._ordered_skills(roadmap_json):
            if item["id"] == skill["id"]:
                state["roadmap_progress"] = {"domain_index": item["domain_index"], "skill_index": item["skill_index"]}
                return

    def _absolute_index_from_progress(self, state: dict[str, Any], roadmap_json: dict[str, Any]) -> int:
        progress = state.get("roadmap_progress") or {"domain_index": 0, "skill_index": 0}
        for item in self._ordered_skills(roadmap_json):
            if item["domain_index"] == progress.get("domain_index") and item["skill_index"] == progress.get("skill_index"):
                return item["absolute_index"]
        return 0

    def _append_unique(self, items: Any, value: int | str) -> list[Any]:
        values = list(items or [])
        if value not in values:
            values.append(value)
        return values
