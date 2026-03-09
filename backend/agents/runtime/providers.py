"""Provider-agnostic LLM access used across agent implementations."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx
import yaml

from app.core.config import settings
from app.core.logging import AgentLogger


def load_llm_config() -> dict[str, Any]:
    config_path = Path(__file__).resolve().parents[2] / "config.yaml"
    raw = yaml.safe_load(config_path.read_text(encoding="utf-8"))
    return raw.get("llm", {})


class ProviderRouter:
    """Thin abstraction over OpenAI, Google, and OpenRouter chat APIs."""

    def __init__(self, *, model_override: str | None = None) -> None:
        llm_cfg = load_llm_config()

        self.provider = str(llm_cfg.get("provider", "openai")).lower()
        self.temperature = float(llm_cfg.get("temperature", 0.2))
        self.timeout_seconds = int(llm_cfg.get("timeout_seconds", 180))
        self.models = llm_cfg.get("models", {})

        configured_model = str(self.models.get(self.provider, "")).strip()
        self.model = str(model_override or configured_model).strip()
        if not self.model:
            raise ValueError(f"No model configured for provider '{self.provider}' in backend/config.yaml")

    async def complete(
        self,
        messages: list[dict[str, str]],
        *,
        response_format: str = "text",
        max_tokens: int = 3000,
        request_id: str | None = None,
        agent_name: str | None = None,
        step: int | None = None,
    ) -> str:
        AgentLogger.info(
            event="llm_request",
            component="llm",
            request_id=request_id,
            agent=agent_name,
            provider=self.provider,
            model=self.model,
            step=step,
            response_format=response_format,
            max_tokens=max_tokens,
        )

        if self.provider == "openai":
            text = await self._openai(messages, response_format=response_format, max_tokens=max_tokens)
        elif self.provider == "openrouter":
            text = await self._openrouter(messages, response_format=response_format, max_tokens=max_tokens)
        elif self.provider == "google":
            text = await self._google(messages, response_format=response_format, max_tokens=max_tokens)
        else:
            raise ValueError(f"Unsupported provider '{self.provider}'")

        AgentLogger.info(
            event="llm_response",
            component="llm",
            request_id=request_id,
            agent=agent_name,
            provider=self.provider,
            model=self.model,
            step=step,
            response_length=len(text),
            response_preview=AgentLogger.preview(text, size=300),
        )
        return text

    async def complete_json(
        self,
        messages: list[dict[str, str]],
        *,
        max_tokens: int = 3000,
        request_id: str | None = None,
        agent_name: str | None = None,
        step: int | None = None,
    ) -> dict[str, Any]:
        raw = await self.complete(
            messages,
            response_format="json",
            max_tokens=max_tokens,
            request_id=request_id,
            agent_name=agent_name,
            step=step,
        )
        return self._parse_json(raw)

    def _parse_json(self, text: str) -> dict[str, Any]:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = "\n".join(line for line in cleaned.splitlines() if not line.strip().startswith("```"))
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            cleaned = cleaned[start : end + 1]
        return json.loads(cleaned)

    async def _openai(self, messages: list[dict[str, str]], *, response_format: str, max_tokens: int) -> str:
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not set")

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "max_completion_tokens": max_tokens,
        }
        if response_format == "json":
            payload["response_format"] = {"type": "json_object"}

        if self.model.startswith("gpt-5"):
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
            return str(data["choices"][0]["message"]["content"])

    async def _openrouter(self, messages: list[dict[str, str]], *, response_format: str, max_tokens: int) -> str:
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is not set")

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": max_tokens,
        }
        if response_format == "json":
            payload["response_format"] = {"type": "json_object"}

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
            return str(data["choices"][0]["message"]["content"])

    async def _google(self, messages: list[dict[str, str]], *, response_format: str, max_tokens: int) -> str:
        if not settings.GOOGLE_API_KEY:
            raise ValueError("GOOGLE_API_KEY is not set")

        rendered_prompt = []
        for message in messages:
            rendered_prompt.append(f"{message['role'].upper()}:\n{message['content']}")
        prompt = "\n\n".join(rendered_prompt)

        payload: dict[str, Any] = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": self.temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        if response_format == "json":
            payload["generationConfig"]["responseMimeType"] = "application/json"

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:generateContent?key={settings.GOOGLE_API_KEY}"
        )
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            try:
                return str(data["candidates"][0]["content"]["parts"][0]["text"])
            except (KeyError, IndexError) as exc:
                raise ValueError(f"Google API returned unexpected response: {json.dumps(data)[:500]}") from exc
