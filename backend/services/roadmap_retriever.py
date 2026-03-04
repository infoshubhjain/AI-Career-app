"""Roadmap retrieval orchestration service."""

from __future__ import annotations

from typing import Any

from app.core.config import settings
from services.roadmap_storage import RoadmapStorage
from utils.embeddings import generate_embedding


class RoadmapRetriever:
    def __init__(self) -> None:
        self.storage = RoadmapStorage()

    async def retrieve_or_new(self, normalized_title: str) -> dict[str, Any]:
        embedding = await generate_embedding(normalized_title)
        matches = await self.storage.find_similar_roadmaps(embedding=embedding, limit=10)

        if matches and matches[0]["distance"] <= settings.ROADMAP_MATCH_THRESHOLD:
            return {
                "status": "exists",
                "roadmap": matches[0]["roadmap_json"],
                "normalized_title": normalized_title,
                "embedding": embedding,
                "distance": matches[0]["distance"],
            }

        return {
            "status": "new",
            "normalized_title": normalized_title,
            "embedding": embedding,
        }
