"""Compatibility wrapper around the shared provider router."""

from __future__ import annotations

from agents.runtime.providers import ProviderRouter
from app.core.logging import RoadmapLogger


class LLMClient:
    def __init__(self) -> None:
        self.router = ProviderRouter()
        self.provider = self.router.provider
        self.model = self.router.model

    async def generate_json(
        self,
        prompt: str,
        max_tokens: int = 7000,
        request_id: str | None = None,
        stage: str | None = None,
        attempt: int | None = None,
    ) -> str:
        RoadmapLogger.info(
            event="llm_call",
            request_id=request_id,
            provider=self.provider,
            model=self.model,
            stage=stage,
            attempt=attempt,
            max_tokens=max_tokens,
            prompt_preview=RoadmapLogger.preview(prompt),
        )
        response = await self.router.complete(
            [{"role": "user", "content": prompt}],
            response_format="json",
            max_tokens=max_tokens,
            request_id=request_id,
            agent_name="roadmap_agent",
            step=attempt,
        )

        RoadmapLogger.info(
            event="llm_response",
            request_id=request_id,
            provider=self.provider,
            model=self.model,
            stage=stage,
            attempt=attempt,
            response_length=len(response),
            response_preview=RoadmapLogger.preview(response),
        )
        return response
