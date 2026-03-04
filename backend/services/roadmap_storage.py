"""Roadmap persistence and vector retrieval service (Supabase-backed)."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from services.supabase_client import get_supabase_admin_client
from utils.embeddings import embedding_to_vector_literal


class RoadmapStorage:
    async def find_similar_roadmaps(self, embedding: list[float], limit: int = 10) -> list[dict[str, Any]]:
        vector_literal = embedding_to_vector_literal(embedding)
        client = get_supabase_admin_client()

        def _rpc_call() -> list[dict[str, Any]]:
            result = client.rpc(
                "match_roadmap_library",
                {"query_embedding": vector_literal, "match_count": limit},
            ).execute()
            return result.data or []

        rows = await asyncio.to_thread(_rpc_call)
        matches: list[dict[str, Any]] = []
        for row in rows:
            matches.append(
                {
                    "id": row.get("id"),
                    "career_title": row.get("career_title"),
                    "roadmap_json": self._coerce_roadmap_json(row.get("roadmap_json")),
                    "distance": float(row.get("distance") or 0.0),
                }
            )
        return matches

    async def insert_roadmap(self, career_title: str, embedding: list[float], roadmap_json: dict[str, Any]) -> None:
        vector_literal = embedding_to_vector_literal(embedding)
        client = get_supabase_admin_client()
        payload = json.loads(json.dumps(roadmap_json, ensure_ascii=False))

        def _rpc_call() -> None:
            client.rpc(
                "upsert_roadmap_library",
                {
                    "in_career_title": career_title,
                    "in_embedding": vector_literal,
                    "in_roadmap_json": payload,
                },
            ).execute()

        await asyncio.to_thread(_rpc_call)

    @staticmethod
    def _coerce_roadmap_json(value: Any) -> dict[str, Any]:
        if isinstance(value, dict):
            return value
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass
        return {}
