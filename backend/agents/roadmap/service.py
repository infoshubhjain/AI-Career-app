"""Roadmap agent pipeline.

Step 1: Generate 6-12 domains in chronological order (beginner -> super advanced)
Step 2: Generate exactly 8 subdomains/skills per domain in chronological order
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from app.models.roadmap import Domain, DomainsResponse, RoadmapResponse, Subdomain
from .llm_client import LLMClient


DOMAIN_PROMPT = """You are an elite curriculum architect.
Generate a roadmap domain list for this query:
{query}

Hard requirements:
1. Output valid JSON only.
2. Return 6-12 domains depending on breadth/complexity.
3. Domain order must be chronological from beginner to highly advanced ("super cracked").
4. Keep domain titles short and concrete (2-5 words).
5. Every domain must include: id, title, description, order.
6. IDs must be lowercase-hyphenated.
7. Domains should not be too broad or too narrow. Their level of broadness should be similar to a university course and should be specific enough to detail what the user will learn within that domain.

JSON shape:
{{
  "query": "string",
  "domains": [
    {{"id":"string", "title":"string", "description":"string", "order":0}}
  ]
}}
"""

SUBDOMAIN_PROMPT = """You are an elite curriculum architect.
Expand this domain roadmap into specific skills.

Query: {query}
Domains:
{domains_json}

Hard requirements:
1. Output valid JSON only.
2. For EACH domain, generate EXACTLY 8 subdomains/skills.
3. Skills must be chronological from foundational -> advanced within each domain.
4. Later domains must include deep advanced skills within the specific career path.
5. Keep each subdomain specific and actionable.
6. Every subdomain must include: id, title, description, order.
7. IDs must be lowercase-hyphenated.
8. Each skill should be specific enough to be a single topic. One that can be learned in a single University lecture. For advanced domains, these skills should be highly technical.

JSON shape:
{{
  "query": "string",
  "domains": [
    {{
      "id":"string",
      "title":"string",
      "description":"string",
      "order":0,
      "subdomains":[
        {{"id":"string", "title":"string", "description":"string", "order":0}}
      ]
    }}
  ]
}}
"""


@dataclass
class AttemptResult:
    data: dict[str, Any] | None
    error: str | None


def _slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9\s-]", "", value)
    value = re.sub(r"\s+", "-", value)
    value = re.sub(r"-+", "-", value)
    return value.strip("-") or "item"


def _extract_json(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = "\n".join(line for line in cleaned.splitlines() if not line.strip().startswith("```"))

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return cleaned
    return cleaned[start : end + 1]


def _normalize_domains(data: dict[str, Any], query: str) -> dict[str, Any]:
    domains = data.get("domains") or []
    normalized: list[dict[str, Any]] = []

    for idx, domain in enumerate(domains):
        title = str(domain.get("title") or f"Domain {idx + 1}").strip()
        description = str(domain.get("description") or "").strip()
        domain_id = str(domain.get("id") or _slugify(title))

        normalized.append(
            {
                "id": _slugify(domain_id),
                "title": title,
                "description": description,
                "order": idx,
                "subdomains": domain.get("subdomains") or [],
            }
        )

    return {"query": data.get("query") or query, "domains": normalized}


def _quality_domains(data: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    domains = data.get("domains") or []
    count = len(domains)

    if count < 6 or count > 12:
        issues.append(f"Expected 6-12 domains, got {count}")

    for domain in domains:
        words = len(str(domain.get("title", "")).split())
        if words < 2 or words > 5:
            issues.append(f"Domain title should be 2-5 words: '{domain.get('title', '')}'")

    return issues


def _quality_skills(data: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    for domain in data.get("domains") or []:
        skills = domain.get("subdomains") or []
        if len(skills) != 8:
            issues.append(f"Domain '{domain.get('title', '')}' has {len(skills)} skills (expected 8)")
    return issues


class RoadmapAgent:
    def __init__(self) -> None:
        self.llm = LLMClient()

    async def _try_json(self, prompt: str, max_tokens: int) -> AttemptResult:
        try:
            raw = await self.llm.generate_json(prompt=prompt, max_tokens=max_tokens)
            parsed = json.loads(_extract_json(raw))
            return AttemptResult(data=parsed, error=None)
        except Exception as exc:  # noqa: BLE001
            return AttemptResult(data=None, error=str(exc))

    async def generate(self, query: str) -> RoadmapResponse:
        domains_data: dict[str, Any] | None = None
        domains_issues: list[str] = []
        domain_errors: list[str] = []

        domains_prompt = DOMAIN_PROMPT.format(query=query)
        for _ in range(3):
            result = await self._try_json(domains_prompt, max_tokens=3500)
            if not result.data:
                if result.error:
                    domain_errors.append(result.error)
                continue
            candidate = _normalize_domains(result.data, query)
            domains_issues = _quality_domains(candidate)
            if not domains_issues:
                domains_data = candidate
                break
            domains_data = candidate
            domains_prompt += "\nFix these issues and regenerate full JSON:\n- " + "\n- ".join(domains_issues[:8])

        if not domains_data:
            if domain_errors:
                raise ValueError(f"Warning: {domain_errors[-1]}")
            raise ValueError("Failed to generate parseable domains")

        best_effort = _normalize_domains(domains_data, query)
        skills_prompt = SUBDOMAIN_PROMPT.format(
            query=query,
            domains_json=json.dumps(best_effort, indent=2, ensure_ascii=False),
        )

        best_with_skills: dict[str, Any] | None = None
        skill_errors: list[str] = []
        for _ in range(3):
            result = await self._try_json(skills_prompt, max_tokens=8000)
            if not result.data:
                if result.error:
                    skill_errors.append(result.error)
                continue

            candidate = _normalize_domains(result.data, query)
            issues = _quality_skills(candidate)
            best_with_skills = candidate
            if not issues:
                break
            skills_prompt += "\nFix these issues and regenerate full JSON:\n- " + "\n- ".join(issues[:12])

        final_data = best_with_skills if best_with_skills else best_effort

        # Ensure subdomains are always present and normalized.
        for domain in final_data["domains"]:
            subdomains = domain.get("subdomains") or []
            normalized_subdomains: list[dict[str, Any]] = []
            for idx, sub in enumerate(subdomains):
                title = str(sub.get("title") or f"Skill {idx + 1}").strip()
                description = str(sub.get("description") or "").strip()
                sub_id = str(sub.get("id") or _slugify(title))
                normalized_subdomains.append(
                    {
                        "id": _slugify(sub_id),
                        "title": title,
                        "description": description,
                        "order": idx,
                    }
                )
            domain["subdomains"] = normalized_subdomains

        # Convert through existing API model for response compatibility.
        domains: list[Domain] = []
        for raw_domain in final_data["domains"]:
            subdomains = [Subdomain(**item) for item in raw_domain.get("subdomains", [])]
            domains.append(
                Domain(
                    id=raw_domain["id"],
                    title=raw_domain["title"],
                    description=raw_domain["description"],
                    order=raw_domain["order"],
                    subdomains=subdomains,
                )
            )

        domains_response = DomainsResponse(query=final_data["query"], domains=domains)
        return RoadmapResponse(query=domains_response.query, domains=domains_response.domains)
