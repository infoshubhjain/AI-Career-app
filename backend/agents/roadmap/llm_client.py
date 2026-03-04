"""LLM client with provider selection from backend/config.yaml."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx
import yaml

from app.core.config import settings
from app.core.logging import RoadmapLogger


class LLMClient:
    def __init__(self) -> None:
        config_path = Path(__file__).resolve().parents[2] / "config.yaml"
        raw = yaml.safe_load(config_path.read_text(encoding="utf-8"))
        llm_cfg = raw.get("llm", {})

        self.provider = str(llm_cfg.get("provider", "openai")).lower()
        self.temperature = float(llm_cfg.get("temperature", 0.2))
        self.timeout_seconds = int(llm_cfg.get("timeout_seconds", 180))
        models = llm_cfg.get("models", {})

        self.model = str(models.get(self.provider, "")).strip()
        if not self.model:
            raise ValueError(f"No model configured for provider '{self.provider}' in backend/config.yaml")

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
            prompt_length=len(prompt),
            prompt_preview=RoadmapLogger.preview(prompt),
        )
        if self.provider == "openai":
            response = await self._openai(prompt, max_tokens)
        elif self.provider == "openrouter":
            response = await self._openrouter(prompt, max_tokens)
        elif self.provider == "google":
            response = await self._google(prompt, max_tokens)
        else:
            raise ValueError(f"Unsupported provider in backend/config.yaml: {self.provider}")

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

    async def _openai(self, prompt: str, max_tokens: int) -> str:
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not set")

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_completion_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        }
        # GPT-5 models currently only accept default temperature behavior.
        if self.model.startswith("gpt-5"):
            # Bias toward emitting final text instead of spending all output budget on reasoning tokens.
            payload["reasoning_effort"] = "minimal"
        else:
            payload["temperature"] = self.temperature

        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def _openrouter(self, prompt: str, max_tokens: int) -> str:
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is not set")

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self.temperature,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        }

        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }

        if settings.OPENROUTER_SITE_URL:
            headers["HTTP-Referer"] = settings.OPENROUTER_SITE_URL
        if settings.OPENROUTER_SITE_NAME:
            headers["X-Title"] = settings.OPENROUTER_SITE_NAME

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def _google(self, prompt: str, max_tokens: int) -> str:
        if not settings.GOOGLE_API_KEY:
            raise ValueError("GOOGLE_API_KEY is not set")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={settings.GOOGLE_API_KEY}"
        payload: dict[str, Any] = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": self.temperature,
                "maxOutputTokens": max_tokens,
                "responseMimeType": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            try:
                return data["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError) as exc:
                raise ValueError(f"Google API returned unexpected response: {json.dumps(data)[:500]}") from exc
