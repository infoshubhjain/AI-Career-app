"""
Pydantic models for roadmap generation
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class RoadmapGenerateRequest(BaseModel):
    """Request model for roadmap generation"""
    query: str = Field(..., min_length=1, description="User query for roadmap generation")


class Subdomain(BaseModel):
    """Subdomain or skill within a domain"""
    id: str = Field(..., description="Unique identifier for the subdomain")
    title: str = Field(..., description="Title of the subdomain")
    description: str = Field(..., description="Description of the subdomain")
    order: int = Field(..., ge=0, description="Order of the subdomain (0-indexed)")


class Domain(BaseModel):
    """Domain within a roadmap"""
    id: str = Field(..., description="Unique identifier for the domain")
    title: str = Field(..., description="Title of the domain")
    description: str = Field(..., description="Description of the domain")
    order: int = Field(..., ge=0, description="Order of the domain (0-indexed)")
    subdomains: Optional[List[Subdomain]] = Field(default=None, description="List of subdomains")


class DomainsResponse(BaseModel):
    """Response from Agent 1 - Domain Generator"""
    query: str = Field(..., description="Original user query")
    domains: List[Domain] = Field(..., description="List of domains")


class RoadmapResponse(BaseModel):
    """Response from Agent 2 - Final Roadmap with Subdomains"""
    query: str = Field(..., description="Original user query")
    domains: List[Domain] = Field(..., description="List of domains with subdomains")
    timestamp: Optional[str] = Field(default=None, description="Timestamp of generation")
    filename: Optional[str] = Field(default=None, description="Filename of saved roadmap")


class RoadmapListResponse(BaseModel):
    """Response for listing all roadmaps"""
    roadmaps: List[RoadmapResponse] = Field(..., description="List of all roadmaps")
