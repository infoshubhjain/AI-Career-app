"""Lightweight web search service for lesson enrichment."""

from __future__ import annotations

import re
from html import unescape

import httpx

from app.core.config import settings


class WebSearchService:
    """Small dependency-free search adapter using DuckDuckGo's HTML endpoint."""

    async def search(self, query: str, *, max_results: int | None = None) -> list[dict[str, str]]:
        limit = max_results or settings.WEB_SEARCH_MAX_RESULTS
        payload = {"q": query}
        headers = {"User-Agent": "Mozilla/5.0"}

        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            response = await client.post("https://html.duckduckgo.com/html/", data=payload, headers=headers)
            response.raise_for_status()

        html = response.text
        matches = re.findall(
            r'<a[^>]*class="result__a"[^>]*href="(?P<href>[^"]+)"[^>]*>(?P<title>.*?)</a>',
            html,
            flags=re.IGNORECASE | re.DOTALL,
        )
        results: list[dict[str, str]] = []
        for href, title in matches[:limit]:
            clean_title = re.sub(r"<.*?>", "", title)
            results.append(
                {
                    "title": unescape(clean_title).strip(),
                    "url": unescape(href).strip(),
                }
            )
        return results
