"""Pydantic models for the multi-agent coaching runtime."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.models.roadmap import RoadmapResponse


class AgentQuestion(BaseModel):
    id: str
    prompt: str
    skill_id: str | None = None
    kind: Literal["profile", "knowledge_probe", "topic_quiz", "skill_quiz", "domain_quiz"] = "profile"


class AgentSessionCreateRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    query: str = Field(..., min_length=1)


class AgentTurnRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)


class AgentSessionResponse(BaseModel):
    session_id: str
    user_id: str
    status: str
    active_agent: str
    message: str
    roadmap: RoadmapResponse | None = None
    pending_questions: list[AgentQuestion] = Field(default_factory=list)
    state: dict[str, Any] = Field(default_factory=dict)


class AgentSessionStateResponse(BaseModel):
    session_id: str
    user_id: str
    status: str
    active_agent: str
    roadmap: RoadmapResponse | None = None
    state: dict[str, Any] = Field(default_factory=dict)
