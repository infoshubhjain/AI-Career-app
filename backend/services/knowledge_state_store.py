"""Durable knowledge-state persistence and selection for skill-level BKT."""

from __future__ import annotations

from dataclasses import replace
from typing import Any

from app.core.logging import AgentLogger
from services.agent_session_store import AgentSessionStore
from services.bkt_engine import BKTEngine, BKTState, MODEL_VERSION


class KnowledgeStateStore:
    """Coordinates global skill priors, project overlays, and BKT observations."""

    def __init__(self, session_store: AgentSessionStore, bkt_engine: BKTEngine) -> None:
        self.session_store = session_store
        self.bkt = bkt_engine

    async def seed_project_skill_states(
        self,
        *,
        user_id: str,
        project_id: str,
        ordered_skills: list[dict[str, Any]],
    ) -> dict[str, dict[str, Any]]:
        skill_ids = [str(skill["id"]) for skill in ordered_skills]
        global_rows = await self.session_store.list_user_skill_knowledge(user_id, skill_ids=skill_ids)
        global_map = {str(row["skill_id"]): row for row in global_rows}
        project_rows = await self.session_store.list_project_skill_knowledge(project_id, skill_ids=skill_ids)
        project_map = {str(row["skill_id"]): row for row in project_rows}
        global_inserts: list[dict[str, Any]] = []
        for skill in ordered_skills:
            skill_id = str(skill["id"])
            if global_map.get(skill_id) is not None:
                continue
            initial = self.bkt.initial_state(
                skill_id=skill_id,
                domain_id=skill.get("domain_id"),
                p_init=self.bkt.default_prior_for_skill(
                    absolute_index=int(skill.get("absolute_index", 0)),
                    total_skills=len(ordered_skills),
                ),
            )
            global_inserts.append(
                {
                    "user_id": user_id,
                    "skill_id": skill_id,
                    "domain_id": skill.get("domain_id"),
                    "p_know": initial.p_know,
                    "p_init": initial.p_init,
                    "p_learn": initial.p_learn,
                    "p_guess": initial.p_guess,
                    "p_slip": initial.p_slip,
                    "observation_count": initial.observation_count,
                    "correct_count": initial.correct_count,
                    "incorrect_count": initial.incorrect_count,
                }
            )
        if global_inserts:
            inserted_globals = await self.session_store.bulk_upsert_user_skill_knowledge(global_inserts)
            for row in inserted_globals:
                global_map[str(row["skill_id"])] = row

        project_inserts: list[dict[str, Any]] = []
        for skill in ordered_skills:
            skill_id = str(skill["id"])
            if project_map.get(skill_id) is not None:
                continue
            global_row = global_map[skill_id]
            project_inserts.append(
                {
                    "project_id": project_id,
                    "user_id": user_id,
                    "skill_id": skill_id,
                    "domain_id": skill.get("domain_id"),
                    "p_know": global_row["p_know"],
                    "p_init": global_row.get("p_init", global_row["p_know"]),
                    "p_learn": global_row.get("p_learn", self.bkt.default_p_learn),
                    "p_guess": global_row.get("p_guess", self.bkt.default_p_guess),
                    "p_slip": global_row.get("p_slip", self.bkt.default_p_slip),
                    "observation_count": global_row.get("observation_count", 0),
                    "correct_count": global_row.get("correct_count", 0),
                    "incorrect_count": global_row.get("incorrect_count", 0),
                    "source_global_updated_at": global_row.get("updated_at"),
                }
            )
        if project_inserts:
            inserted_projects = await self.session_store.bulk_upsert_project_skill_knowledge(project_inserts)
            for row in inserted_projects:
                project_map[str(row["skill_id"])] = row

        return {
            str(skill["id"]): self._summary_from_rows(skill, global_map[str(skill["id"])], project_map[str(skill["id"])])
            for skill in ordered_skills
        }

    async def list_project_skill_summaries(
        self,
        *,
        user_id: str,
        project_id: str,
        ordered_skills: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        await self.seed_project_skill_states(user_id=user_id, project_id=project_id, ordered_skills=ordered_skills)
        global_rows = await self.session_store.list_user_skill_knowledge(user_id, skill_ids=[str(skill["id"]) for skill in ordered_skills])
        project_rows = await self.session_store.list_project_skill_knowledge(project_id, skill_ids=[str(skill["id"]) for skill in ordered_skills])
        global_map = {str(row["skill_id"]): row for row in global_rows}
        project_map = {str(row["skill_id"]): row for row in project_rows}
        return [self._summary_from_rows(skill, global_map[str(skill["id"])], project_map[str(skill["id"])]) for skill in ordered_skills]

    async def select_next_skill(
        self,
        *,
        user_id: str,
        project_id: str,
        ordered_skills: list[dict[str, Any]],
        recent_skill_ids: list[str] | None = None,
    ) -> dict[str, Any] | None:
        summaries = await self.list_project_skill_summaries(
            user_id=user_id,
            project_id=project_id,
            ordered_skills=ordered_skills,
        )
        if not summaries:
            return None
        recent_ids = {str(skill_id) for skill_id in (recent_skill_ids or [])[-3:]}
        probabilities = [float(item["project_p_know"]) for item in summaries]
        frontier_index = self.bkt.frontier_index(probabilities)
        if frontier_index is None:
            frontier_index = len(summaries) - 1

        ranked: list[tuple[float, dict[str, Any]]] = []
        for item in summaries:
            state = self._state_from_summary(item)
            distance = abs(int(item["absolute_index"]) - frontier_index)
            score = self.bkt.selection_score(
                state,
                distance_from_frontier=distance,
                recently_asked=str(item["skill_id"]) in recent_ids,
            )
            ranked.append(
                (
                    score,
                    {
                        **item,
                        "selection_score": score,
                        "selection_reason": "max_expected_information_gain",
                        "frontier_index": frontier_index,
                    },
                )
            )
        ranked.sort(key=lambda entry: (entry[0], -abs(int(entry[1]["absolute_index"]) - frontier_index)), reverse=True)
        selected = ranked[0][1]
        AgentLogger.info(
            event="bkt_skill_selected",
            component="knowledge_state_store",
            project_id=project_id,
            user_id=user_id,
            skill_id=selected["skill_id"],
            selection_score=selected["selection_score"],
            frontier_index=frontier_index,
        )
        return selected

    async def apply_quiz_observation(
        self,
        *,
        user_id: str,
        project_id: str,
        session_id: str,
        quiz: dict[str, Any],
        attempt_id: int | None,
        is_correct: bool,
        selection_reason: str = "",
        selection_score: float | None = None,
        override_p_learn: float | None = None,
        override_p_guess: float | None = None,
        override_p_slip: float | None = None,
    ) -> dict[str, Any]:
        skill_id = str(quiz.get("skill_id") or "")
        if not skill_id:
            return {}
        global_rows = await self.session_store.list_user_skill_knowledge(user_id, skill_ids=[skill_id])
        project_rows = await self.session_store.list_project_skill_knowledge(project_id, skill_ids=[skill_id])
        if not project_rows:
            raise ValueError(f"Project skill knowledge for '{skill_id}' is not initialized")
        project_row = project_rows[0]
        global_row = global_rows[0] if global_rows else None
        project_state = self._state_from_row(project_row)
        update_state = project_state
        if override_p_learn is not None or override_p_guess is not None or override_p_slip is not None:
            update_state = replace(
                project_state,
                p_learn=project_state.p_learn if override_p_learn is None else float(override_p_learn),
                p_guess=project_state.p_guess if override_p_guess is None else float(override_p_guess),
                p_slip=project_state.p_slip if override_p_slip is None else float(override_p_slip),
            )
        update = self.bkt.update(update_state, is_correct=is_correct)
        updated_project = await self.session_store.upsert_project_skill_knowledge(
            {
                "project_id": project_id,
                "user_id": user_id,
                "skill_id": skill_id,
                "domain_id": project_row.get("domain_id") or quiz.get("domain_id"),
                "p_know": update.posterior_after,
                "p_init": project_state.p_init,
                "p_learn": project_state.p_learn,
                "p_guess": project_state.p_guess,
                "p_slip": project_state.p_slip,
                "source_global_updated_at": (global_row or {}).get("updated_at"),
                "observation_count": project_state.observation_count + 1,
                "correct_count": project_state.correct_count + (1 if is_correct else 0),
                "incorrect_count": project_state.incorrect_count + (0 if is_correct else 1),
                "last_quiz_id": quiz["id"],
                "last_attempt_id": attempt_id,
            }
        )
        global_payload = global_row or {
            "user_id": user_id,
            "skill_id": skill_id,
            "domain_id": project_row.get("domain_id") or quiz.get("domain_id"),
            "p_init": project_state.p_init,
            "p_learn": project_state.p_learn,
            "p_guess": project_state.p_guess,
            "p_slip": project_state.p_slip,
            "observation_count": 0,
            "correct_count": 0,
            "incorrect_count": 0,
        }
        global_observation_count = int(global_payload.get("observation_count") or 0)
        weight = min(0.35, 1.0 / max(3, global_observation_count + 1))
        global_posterior = ((1.0 - weight) * float(global_payload.get("p_know") or project_state.p_know)) + (weight * update.posterior_after)
        updated_global = await self.session_store.upsert_user_skill_knowledge(
            {
                "user_id": user_id,
                "skill_id": skill_id,
                "domain_id": global_payload.get("domain_id") or quiz.get("domain_id"),
                "p_know": global_posterior,
                "p_init": global_payload.get("p_init") or project_state.p_init,
                "p_learn": global_payload.get("p_learn") or project_state.p_learn,
                "p_guess": global_payload.get("p_guess") or project_state.p_guess,
                "p_slip": global_payload.get("p_slip") or project_state.p_slip,
                "observation_count": global_observation_count + 1,
                "correct_count": int(global_payload.get("correct_count") or 0) + (1 if is_correct else 0),
                "incorrect_count": int(global_payload.get("incorrect_count") or 0) + (0 if is_correct else 1),
                "last_quiz_id": quiz["id"],
                "last_attempt_id": attempt_id,
            }
        )
        return {
            "skill_id": skill_id,
            "domain_id": quiz.get("domain_id"),
            "assessment": self.bkt.assessment(update.posterior_after, is_correct=is_correct),
            "confidence": update.confidence,
            "posterior_before": update.posterior_before,
            "posterior_after": update.posterior_after,
            "uncertainty": update.uncertainty,
            "global_p_know": updated_global["p_know"],
            "project_p_know": updated_project["p_know"],
            "observation_count": updated_project["observation_count"],
            "model_version": MODEL_VERSION,
        }

    async def create_observation(
        self,
        *,
        user_id: str,
        project_id: str,
        session_id: str,
        quiz: dict[str, Any],
        attempt_id: int,
        is_correct: bool,
        posterior_before: float,
        posterior_after: float,
        selection_reason: str = "",
        selection_score: float | None = None,
    ) -> dict[str, Any]:
        return await self.session_store.create_user_skill_observation(
            {
                "user_id": user_id,
                "project_id": project_id,
                "session_id": session_id,
                "quiz_id": quiz["id"],
                "attempt_id": attempt_id,
                "skill_id": quiz.get("skill_id"),
                "domain_id": quiz.get("domain_id"),
                "is_correct": is_correct,
                "posterior_before": posterior_before,
                "posterior_after": posterior_after,
                "selection_reason": selection_reason or "",
                "selection_score": selection_score,
                "model_version": MODEL_VERSION,
            }
        )

    def placement_snapshot(
        self,
        *,
        ordered_skills: list[dict[str, Any]],
        summaries: list[dict[str, Any]],
        question_budget_used: int,
        max_questions: int,
        stop_reason: str | None = None,
    ) -> dict[str, Any]:
        probabilities = [float(item["project_p_know"]) for item in summaries]
        observations = [int(item["observation_count"]) for item in summaries]
        frontier_index = self.bkt.frontier_index(probabilities)
        frontier = ordered_skills[frontier_index] if frontier_index is not None and 0 <= frontier_index < len(ordered_skills) else None
        return {
            "phase": "complete" if stop_reason else "probing",
            "question_budget_used": question_budget_used,
            "max_questions": max_questions,
            "stop_reason": stop_reason,
            "selection_policy": "bkt_expected_information_gain",
            "frontier_index": frontier_index,
            "frontier_skill_id": frontier.get("id") if frontier else None,
            "frontier_skill_title": frontier.get("title") if frontier else None,
            "recent_history": [],
            "skill_probability_summary": [
                {
                    "skill_id": item["skill_id"],
                    "skill_title": item["skill_title"],
                    "absolute_index": item["absolute_index"],
                    "p_know": item["project_p_know"],
                    "global_p_know": item["global_p_know"],
                    "confidence": item["confidence"],
                    "observation_count": item["observation_count"],
                }
                for item in summaries
            ],
        }

    def should_stop(
        self,
        *,
        summaries: list[dict[str, Any]],
        question_budget_used: int,
        max_questions: int,
    ) -> tuple[bool, str | None]:
        return self.bkt.should_stop(
            ordered_probabilities=[float(item["project_p_know"]) for item in summaries],
            ordered_observations=[int(item["observation_count"]) for item in summaries],
            question_budget_used=question_budget_used,
            max_questions=max_questions,
        )

    def summarize_frontier(self, summaries: list[dict[str, Any]]) -> dict[str, Any] | None:
        probabilities = [float(item["project_p_know"]) for item in summaries]
        frontier_index = self.bkt.frontier_index(probabilities)
        if frontier_index is None or frontier_index >= len(summaries):
            return None
        item = summaries[frontier_index]
        return {
            "id": item["skill_id"],
            "title": item["skill_title"],
            "absolute_index": item["absolute_index"],
            "domain_id": item["domain_id"],
            "domain_title": item["domain_title"],
            "description": item["description"],
            "order": item["order"],
            "p_know": item["project_p_know"],
            "confidence": item["confidence"],
            "observation_count": item["observation_count"],
        }

    def _summary_from_rows(self, skill: dict[str, Any], global_row: dict[str, Any], project_row: dict[str, Any]) -> dict[str, Any]:
        return {
            "skill_id": skill["id"],
            "skill_title": skill["title"],
            "description": skill.get("description"),
            "absolute_index": skill.get("absolute_index", 0),
            "domain_id": skill.get("domain_id"),
            "domain_title": skill.get("domain_title"),
            "order": skill.get("order"),
            "global_p_know": float(global_row.get("p_know") or 0.5),
            "project_p_know": float(project_row.get("p_know") or global_row.get("p_know") or 0.5),
            "confidence": self.bkt.confidence(float(project_row.get("p_know") or global_row.get("p_know") or 0.5)),
            "observation_count": int(project_row.get("observation_count") or 0),
            "correct_count": int(project_row.get("correct_count") or 0),
            "incorrect_count": int(project_row.get("incorrect_count") or 0),
            "p_init": float(project_row.get("p_init") or global_row.get("p_init") or 0.5),
            "p_learn": float(project_row.get("p_learn") or global_row.get("p_learn") or self.bkt.default_p_learn),
            "p_guess": float(project_row.get("p_guess") or global_row.get("p_guess") or self.bkt.default_p_guess),
            "p_slip": float(project_row.get("p_slip") or global_row.get("p_slip") or self.bkt.default_p_slip),
        }

    def _state_from_summary(self, summary: dict[str, Any]) -> BKTState:
        return BKTState(
            skill_id=str(summary["skill_id"]),
            domain_id=summary.get("domain_id"),
            p_know=float(summary["project_p_know"]),
            p_init=float(summary.get("p_init") or summary["project_p_know"]),
            p_learn=float(summary.get("p_learn") or self.bkt.default_p_learn),
            p_guess=float(summary.get("p_guess") or self.bkt.default_p_guess),
            p_slip=float(summary.get("p_slip") or self.bkt.default_p_slip),
            observation_count=int(summary.get("observation_count") or 0),
            correct_count=int(summary.get("correct_count") or 0),
            incorrect_count=int(summary.get("incorrect_count") or 0),
        )

    def _state_from_row(self, row: dict[str, Any]) -> BKTState:
        return BKTState(
            skill_id=str(row["skill_id"]),
            domain_id=row.get("domain_id"),
            p_know=float(row.get("p_know") or 0.5),
            p_init=float(row.get("p_init") or row.get("p_know") or 0.5),
            p_learn=float(row.get("p_learn") or self.bkt.default_p_learn),
            p_guess=float(row.get("p_guess") or self.bkt.default_p_guess),
            p_slip=float(row.get("p_slip") or self.bkt.default_p_slip),
            observation_count=int(row.get("observation_count") or 0),
            correct_count=int(row.get("correct_count") or 0),
            incorrect_count=int(row.get("incorrect_count") or 0),
        )
