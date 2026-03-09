"""Compatibility wrapper around the shared provider router."""

from __future__ import annotations

from agents.runtime.providers import ProviderRouter, load_llm_config
from app.core.logging import RoadmapLogger


class LLMClient:
    def __init__(self) -> None:
        llm_cfg = load_llm_config()
        roadmap_model = str(llm_cfg.get("roadmap_model", "")).strip() or None

        self.router = ProviderRouter(model_override=roadmap_model)
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
