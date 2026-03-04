"""Roadmap API endpoints backed by backend/agents/roadmap."""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, HTTPException
from slugify import slugify

from app.models.roadmap import RoadmapGenerateRequest, RoadmapGenerateResponse, RoadmapListResponse, RoadmapResponse
from agents.roadmap import RoadmapAgent


router = APIRouter(prefix="/api/roadmap", tags=["Roadmap"])
ROADMAPS_DIR = Path(__file__).parent.parent.parent / "roadmaps"
ROADMAPS_DIR.mkdir(exist_ok=True)


agent = RoadmapAgent()


def _generate_filename(query: str, suffix: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    slug = slugify(query, max_length=50)
    return f"{timestamp}_{slug}_{suffix}.json"


def _save_roadmap(data: dict, filename: str) -> None:
    filepath = ROADMAPS_DIR / filename
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


@router.post("/generate", response_model=RoadmapGenerateResponse)
async def generate_roadmap(request: RoadmapGenerateRequest) -> RoadmapGenerateResponse:
    request_id = str(uuid.uuid4())
    query = request.query.strip()

    if not query:
        raise HTTPException(status_code=422, detail="Query cannot be empty")

    try:
        roadmap_response = await agent.generate(query=query)
        if roadmap_response.existing:
            return RoadmapGenerateResponse(roadmap=roadmap_response, existing=True)

        domains_filename = _generate_filename(query, "domains")
        _save_roadmap(
            {
                "query": roadmap_response.query,
                "domains": [
                    {
                        "id": d.id,
                        "title": d.title,
                        "description": d.description,
                        "order": d.order,
                    }
                    for d in roadmap_response.domains
                ],
            },
            domains_filename,
        )

        final_filename = _generate_filename(query, "final")
        roadmap_response.timestamp = datetime.now().isoformat()
        roadmap_response.filename = final_filename
        _save_roadmap(roadmap_response.model_dump(), final_filename)

        return RoadmapGenerateResponse(roadmap=roadmap_response, existing=False)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to generate valid roadmap: {str(exc)} (request_id={request_id})",
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(exc)} (request_id={request_id})",
        ) from exc


@router.get("/list", response_model=RoadmapListResponse)
async def list_roadmaps() -> RoadmapListResponse:
    try:
        roadmaps: List[RoadmapResponse] = []
        final_files = sorted(
            ROADMAPS_DIR.glob("*_final.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )

        for filepath in final_files:
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                roadmap = RoadmapResponse(**data)
                if not roadmap.filename:
                    roadmap.filename = filepath.name
                if not roadmap.timestamp:
                    roadmap.timestamp = datetime.fromtimestamp(filepath.stat().st_mtime).isoformat()
                roadmaps.append(roadmap)
            except Exception:
                continue

        return RoadmapListResponse(roadmaps=roadmaps)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Failed to list roadmaps: {str(exc)}") from exc
