"""
Roadmap API endpoints
"""

import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException
from slugify import slugify

from app.models.roadmap import (
    RoadmapGenerateRequest,
    RoadmapResponse,
    RoadmapListResponse
)
from app.services.agents import Agent1DomainGenerator, Agent2SubdomainGenerator
from app.core.logging import RoadmapLogger


router = APIRouter(prefix="/api/roadmap", tags=["Roadmap"])

# Roadmaps directory
ROADMAPS_DIR = Path(__file__).parent.parent.parent / "roadmaps"
ROADMAPS_DIR.mkdir(exist_ok=True)


def _generate_filename(query: str, suffix: str) -> str:
    """
    Generate filename for roadmap JSON
    
    Args:
        query: User query
        suffix: File suffix (e.g., 'domains', 'final')
    
    Returns:
        Filename with timestamp and slugified query
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    slug = slugify(query, max_length=50)
    return f"{timestamp}_{slug}_{suffix}.json"


def _save_roadmap(data: dict, filename: str, request_id: str):
    """
    Save roadmap JSON to file
    
    Args:
        data: Roadmap data to save
        filename: Filename to save as
        request_id: Request ID for logging
    """
    filepath = ROADMAPS_DIR / filename
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    RoadmapLogger.log_file_saved(
        filename=filename,
        request_id=request_id,
        file_type=filepath.suffix
    )


@router.post("/generate", response_model=RoadmapResponse)
async def generate_roadmap(request: RoadmapGenerateRequest):
    """
    Generate a roadmap using two-step agent pipeline
    
    Step 1: Domain Generator - generates high-level domains
    Step 2: Subdomain Generator - expands domains with specific skills
    
    Both agent outputs are saved as JSON files in the roadmaps/ directory.
    """
    request_id = str(uuid.uuid4())
    query = request.query
    
    # Log request
    RoadmapLogger.log_request(query=query, request_id=request_id)
    
    try:
        # ===== Agent 1: Generate Domains =====
        domains_response = await Agent1DomainGenerator.generate(
            query=query,
            request_id=request_id
        )
        
        # Save Agent 1 output
        domains_filename = _generate_filename(query, "domains")
        _save_roadmap(
            data=domains_response.model_dump(),
            filename=domains_filename,
            request_id=request_id
        )
        
        # ===== Agent 2: Generate Subdomains =====
        roadmap_response = await Agent2SubdomainGenerator.generate(
            query=query,
            domains_response=domains_response,
            request_id=request_id
        )
        
        # Save Agent 2 output (final roadmap)
        final_filename = _generate_filename(query, "final")
        
        # Add metadata to response
        roadmap_response.timestamp = datetime.now().isoformat()
        roadmap_response.filename = final_filename
        
        _save_roadmap(
            data=roadmap_response.model_dump(),
            filename=final_filename,
            request_id=request_id
        )
        
        # Log successful response
        RoadmapLogger.log_response_sent(
            request_id=request_id,
            success=True
        )
        
        return roadmap_response
    
    except ValueError as e:
        # Validation or parsing error
        RoadmapLogger.log_response_sent(
            request_id=request_id,
            success=False,
            error=str(e)
        )
        raise HTTPException(
            status_code=422,
            detail=f"Failed to generate valid roadmap: {str(e)}"
        )
    
    except Exception as e:
        # Unexpected error
        RoadmapLogger.log_error(
            event="unexpected_error",
            request_id=request_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )


@router.get("/list", response_model=RoadmapListResponse)
async def list_roadmaps():
    """
    List all saved roadmap JSON files
    
    Returns roadmaps sorted by creation time (newest first).
    Only returns *_final.json files (complete roadmaps).
    """
    try:
        roadmaps: List[RoadmapResponse] = []
        
        # Get all final roadmap files
        final_files = sorted(
            ROADMAPS_DIR.glob("*_final.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True  # Newest first
        )
        
        # Parse each file
        for filepath in final_files:
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                # Validate and add to list
                roadmap = RoadmapResponse(**data)
                
                # Add filename if not present
                if not roadmap.filename:
                    roadmap.filename = filepath.name
                
                # Add timestamp from file if not present
                if not roadmap.timestamp:
                    roadmap.timestamp = datetime.fromtimestamp(
                        filepath.stat().st_mtime
                    ).isoformat()
                
                roadmaps.append(roadmap)
            
            except (json.JSONDecodeError, Exception) as e:
                # Skip invalid files
                print(f"Warning: Failed to parse {filepath.name}: {e}")
                continue
        
        return RoadmapListResponse(roadmaps=roadmaps)
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list roadmaps: {str(e)}"
        )
