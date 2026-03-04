"""Career normalization service using a cheap fixed model."""

from __future__ import annotations

import re

import httpx

from app.core.config import settings


NORMALIZE_PROMPT = """Normalize the following user career goal into a concise canonical career identifier.
Return ONLY a snake_case career title with no extra text.

Example outputs:
ai_engineer
dentist
frontend_developer
data_scientist

User goal:
{user_query}
"""


class CareerNormalizer:
    async def normalize_career(self, query: str) -> str:
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not set")

        prompt = NORMALIZE_PROMPT.format(user_query=query)
        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0,
            "max_tokens": 32,
        }
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

        raw = str(data["choices"][0]["message"]["content"] or "").strip().lower()
        raw = raw.splitlines()[0].strip() if raw else ""
        normalized = re.sub(r"[^a-z0-9_]+", "_", raw)
        normalized = re.sub(r"_+", "_", normalized).strip("_")

        if not normalized:
            fallback = re.sub(r"[^a-z0-9]+", "_", query.lower())
            normalized = re.sub(r"_+", "_", fallback).strip("_") or "career_goal"

        return normalized
