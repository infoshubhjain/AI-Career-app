"""Supabase-backed persistence for projects, sessions, events, memories, and quizzes."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from services.supabase_client import get_supabase_admin_client


class AgentSessionStore:
    """Persistence wrapper around the project/session runtime model."""

    projects_table = "projects"
    sessions_table = "agent_sessions"
    events_table = "agent_events"
    memories_table = "agent_memories"
    quizzes_table = "agent_quizzes"
    quiz_attempts_table = "agent_quiz_attempts"
    user_skill_knowledge_table = "user_skill_knowledge"
    project_skill_knowledge_table = "project_skill_knowledge"
    user_skill_observations_table = "user_skill_observations"
    profiles_table = "profiles"

    tables_with_updated_at = {
        projects_table,
        sessions_table,
        events_table,
        memories_table,
        quizzes_table,
        user_skill_knowledge_table,
        project_skill_knowledge_table,
        profiles_table,
    }

    async def create_project(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._insert(self.projects_table, payload)

    async def get_project(self, project_id: str) -> dict[str, Any]:
        client = get_supabase_admin_client()

        def _read() -> dict[str, Any]:
            result = client.table(self.projects_table).select("*").eq("id", project_id).limit(1).execute()
            rows = result.data or []
            if not rows:
                raise ValueError(f"Project '{project_id}' not found")
            return rows[0]

        return await asyncio.to_thread(_read)

    async def delete_project(self, project_id: str, user_id: str) -> bool:
        client = get_supabase_admin_client()

        def _delete() -> bool:
            result = client.table(self.projects_table).delete().eq("id", project_id).eq("user_id", user_id).execute()
            rows = result.data or []
            return bool(rows)

        return await asyncio.to_thread(_delete)

    async def list_projects(self, user_id: str, *, limit: int = 50) -> list[dict[str, Any]]:
        client = get_supabase_admin_client()

        def _list() -> list[dict[str, Any]]:
            result = (
                client.table(self.projects_table)
                .select("*")
                .eq("user_id", user_id)
                .order("updated_at", desc=True)
                .limit(limit)
                .execute()
            )
            return result.data or []

        return await asyncio.to_thread(_list)

    async def get_profile(self, user_id: str) -> dict[str, Any] | None:
        client = get_supabase_admin_client()

        def _read() -> dict[str, Any] | None:
            result = client.table(self.profiles_table).select("*").eq("id", user_id).limit(1).execute()
            rows = result.data or []
            return rows[0] if rows else None

        return await asyncio.to_thread(_read)

    async def update_project(self, project_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        client = get_supabase_admin_client()
        patch = {**patch, "updated_at": self._now()}

        def _update() -> dict[str, Any]:
            result = client.table(self.projects_table).update(patch).eq("id", project_id).execute()
            rows = result.data or []
            if not rows:
                raise ValueError(f"Project '{project_id}' could not be updated")
            return rows[0]

        return await asyncio.to_thread(_update)

    async def create_session(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._insert(self.sessions_table, payload)

    async def get_session(self, session_id: str) -> dict[str, Any]:
        client = get_supabase_admin_client()

        def _read() -> dict[str, Any]:
            result = client.table(self.sessions_table).select("*").eq("id", session_id).limit(1).execute()
            rows = result.data or []
            if not rows:
                raise ValueError(f"Session '{session_id}' not found")
            return rows[0]

        return await asyncio.to_thread(_read)

    async def get_latest_session_for_project(self, project_id: str) -> dict[str, Any] | None:
        client = get_supabase_admin_client()

        def _read() -> dict[str, Any] | None:
            project_result = client.table(self.projects_table).select("latest_session_id").eq("id", project_id).limit(1).execute()
            project_rows = project_result.data or []
            latest_session_id = project_rows[0].get("latest_session_id") if project_rows else None
            if latest_session_id:
                session_result = client.table(self.sessions_table).select("*").eq("id", latest_session_id).limit(1).execute()
                session_rows = session_result.data or []
                if session_rows:
                    return session_rows[0]

            fallback_result = (
                client.table(self.sessions_table)
                .select("*")
                .eq("project_id", project_id)
                .order("updated_at", desc=True)
                .limit(1)
                .execute()
            )
            fallback_rows = fallback_result.data or []
            return fallback_rows[0] if fallback_rows else None

        return await asyncio.to_thread(_read)

    async def update_session(self, session_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        client = get_supabase_admin_client()
        patch = {**patch, "updated_at": self._now()}

        def _update() -> dict[str, Any]:
            result = client.table(self.sessions_table).update(patch).eq("id", session_id).execute()
            rows = result.data or []
            if not rows:
                raise ValueError(f"Session '{session_id}' could not be updated")
            return rows[0]

        return await asyncio.to_thread(_update)

    async def append_event(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._insert(self.events_table, payload)

    async def list_events(self, session_id: str, *, limit: int = 500) -> list[dict[str, Any]]:
        client = get_supabase_admin_client()

        def _list() -> list[dict[str, Any]]:
            result = (
                client.table(self.events_table)
                .select("*")
                .eq("session_id", session_id)
                .order("created_at", desc=False)
                .limit(limit)
                .execute()
            )
            return result.data or []

        return await asyncio.to_thread(_list)

    async def create_memory(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._insert(self.memories_table, payload)

    async def list_memories(self, session_id: str) -> list[dict[str, Any]]:
        client = get_supabase_admin_client()

        def _list() -> list[dict[str, Any]]:
            result = (
                client.table(self.memories_table)
                .select("*")
                .eq("session_id", session_id)
                .order("created_at", desc=False)
                .execute()
            )
            return result.data or []

        return await asyncio.to_thread(_list)

    async def create_quiz(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._insert(self.quizzes_table, payload)

    async def get_quiz(self, quiz_id: str) -> dict[str, Any]:
        client = get_supabase_admin_client()

        def _read() -> dict[str, Any]:
            result = client.table(self.quizzes_table).select("*").eq("id", quiz_id).limit(1).execute()
            rows = result.data or []
            if not rows:
                raise ValueError(f"Quiz '{quiz_id}' not found")
            return rows[0]

        return await asyncio.to_thread(_read)

    async def update_quiz(self, quiz_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        client = get_supabase_admin_client()
        patch = {**patch, "updated_at": self._now()}

        def _update() -> dict[str, Any]:
            result = client.table(self.quizzes_table).update(patch).eq("id", quiz_id).execute()
            rows = result.data or []
            if not rows:
                raise ValueError(f"Quiz '{quiz_id}' could not be updated")
            return rows[0]

        return await asyncio.to_thread(_update)

    async def create_quiz_attempt(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._insert(self.quiz_attempts_table, payload)

    async def list_user_skill_knowledge(self, user_id: str, *, skill_ids: list[str] | None = None) -> list[dict[str, Any]]:
        client = get_supabase_admin_client()

        def _list() -> list[dict[str, Any]]:
            query = client.table(self.user_skill_knowledge_table).select("*").eq("user_id", user_id)
            if skill_ids:
                query = query.in_("skill_id", skill_ids)
            result = query.execute()
            return result.data or []

        return await asyncio.to_thread(_list)

    async def list_project_skill_knowledge(self, project_id: str, *, skill_ids: list[str] | None = None) -> list[dict[str, Any]]:
        client = get_supabase_admin_client()

        def _list() -> list[dict[str, Any]]:
            query = client.table(self.project_skill_knowledge_table).select("*").eq("project_id", project_id)
            if skill_ids:
                query = query.in_("skill_id", skill_ids)
            result = query.execute()
            return result.data or []

        return await asyncio.to_thread(_list)

    async def upsert_user_skill_knowledge(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._upsert(self.user_skill_knowledge_table, payload, on_conflict="user_id,skill_id")

    async def upsert_project_skill_knowledge(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._upsert(self.project_skill_knowledge_table, payload, on_conflict="project_id,skill_id")

    async def bulk_upsert_user_skill_knowledge(self, payloads: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return await self._bulk_upsert(self.user_skill_knowledge_table, payloads, on_conflict="user_id,skill_id")

    async def bulk_upsert_project_skill_knowledge(self, payloads: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return await self._bulk_upsert(self.project_skill_knowledge_table, payloads, on_conflict="project_id,skill_id")

    async def create_user_skill_observation(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._insert(self.user_skill_observations_table, payload)

    async def update_profile(self, user_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        client = get_supabase_admin_client()
        patch = {**patch, "updated_at": self._now()}

        def _update() -> dict[str, Any]:
            result = client.table(self.profiles_table).update(patch).eq("id", user_id).execute()
            rows = result.data or []
            if rows:
                return rows[0]

            profile_payload = {
                "id": user_id,
                "display_name": "Career Explorer",
                "avatar_url": None,
                "xp": 0,
                "streak_days": 0,
                "current_level": 1,
                **patch,
            }
            insert_result = client.table(self.profiles_table).upsert(profile_payload, on_conflict="id").execute()
            insert_rows = insert_result.data or []
            if not insert_rows:
                raise ValueError(f"Profile '{user_id}' could not be updated")
            return insert_rows[0]

        return await asyncio.to_thread(_update)

    async def _insert(self, table: str, payload: dict[str, Any]) -> dict[str, Any]:
        client = get_supabase_admin_client()
        full_payload = {
            **payload,
            "created_at": payload.get("created_at") or self._now(),
        }
        if table in self.tables_with_updated_at:
            full_payload["updated_at"] = payload.get("updated_at") or self._now()

        def _write() -> dict[str, Any]:
            result = client.table(table).insert(full_payload).execute()
            rows = result.data or []
            if not rows:
                raise ValueError(f"Insert into '{table}' returned no rows")
            return rows[0]

        return await asyncio.to_thread(_write)

    async def _upsert(self, table: str, payload: dict[str, Any], *, on_conflict: str) -> dict[str, Any]:
        client = get_supabase_admin_client()
        full_payload = dict(payload)
        if table in self.tables_with_updated_at:
            full_payload["updated_at"] = payload.get("updated_at") or self._now()

        def _write() -> dict[str, Any]:
            result = client.table(table).upsert(full_payload, on_conflict=on_conflict).execute()
            rows = result.data or []
            if not rows:
                raise ValueError(f"Upsert into '{table}' returned no rows")
            return rows[0]

        return await asyncio.to_thread(_write)

    async def _bulk_upsert(self, table: str, payloads: list[dict[str, Any]], *, on_conflict: str) -> list[dict[str, Any]]:
        if not payloads:
            return []
        client = get_supabase_admin_client()
        normalized_payloads: list[dict[str, Any]] = []
        for payload in payloads:
            full_payload = dict(payload)
            if table in self.tables_with_updated_at:
                full_payload["updated_at"] = payload.get("updated_at") or self._now()
            normalized_payloads.append(full_payload)

        def _write() -> list[dict[str, Any]]:
            result = client.table(table).upsert(normalized_payloads, on_conflict=on_conflict).execute()
            return result.data or []

        return await asyncio.to_thread(_write)

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()
