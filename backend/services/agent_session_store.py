"""Supabase-backed persistence for agent sessions, events, and memories."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from services.supabase_client import get_supabase_admin_client


class AgentSessionStore:
    """Persistence wrapper around JSON-heavy session state."""

    sessions_table = "agent_sessions"
    events_table = "agent_events"
    memories_table = "agent_memories"

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

    async def list_events(self, session_id: str, *, limit: int = 50) -> list[dict[str, Any]]:
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

    async def _insert(self, table: str, payload: dict[str, Any]) -> dict[str, Any]:
        client = get_supabase_admin_client()
        full_payload = {
            **payload,
            "created_at": payload.get("created_at") or self._now(),
            "updated_at": payload.get("updated_at") or self._now(),
        }

        def _write() -> dict[str, Any]:
            result = client.table(table).insert(full_payload).execute()
            rows = result.data or []
            if not rows:
                raise ValueError(f"Insert into '{table}' returned no rows")
            return rows[0]

        return await asyncio.to_thread(_write)

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()
