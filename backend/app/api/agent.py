"""API endpoints for the multi-agent coaching runtime."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from agents.orchestrator import LearningOrchestrator
from app.models.agent import (
    AgentDeleteResponse,
    AgentEventResponse,
    AgentProjectLatestSessionResponse,
    AgentProjectSummary,
    AgentSessionCreateRequest,
    AgentSessionResponse,
    AgentSessionStateResponse,
    AgentTurnRequest,
)


router = APIRouter(prefix="/api/agent", tags=["Agent"])
orchestrator = LearningOrchestrator()


@router.post("/sessions", response_model=AgentSessionResponse)
async def create_agent_session(request: AgentSessionCreateRequest) -> AgentSessionResponse:
    try:
        return await orchestrator.create_session(user_id=request.user_id, query=request.query, learning_style=request.learning_style)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/sessions/{session_id}", response_model=AgentSessionStateResponse)
async def get_agent_session(session_id: str) -> AgentSessionStateResponse:
    try:
        return await orchestrator.get_session(session_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/projects", response_model=list[AgentProjectSummary])
async def list_agent_projects(user_id: str = Query(..., min_length=1)) -> list[AgentProjectSummary]:
    try:
        return await orchestrator.list_projects(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/projects/{project_id}", response_model=AgentProjectSummary)
async def get_agent_project(project_id: str, user_id: str = Query(..., min_length=1)) -> AgentProjectSummary:
    try:
        return await orchestrator.get_project_summary(project_id=project_id, user_id=user_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/projects/{project_id}/latest-session", response_model=AgentProjectLatestSessionResponse)
async def get_project_latest_session(project_id: str, user_id: str = Query(..., min_length=1)) -> AgentProjectLatestSessionResponse:
    try:
        return await orchestrator.get_project_latest_session(project_id=project_id, user_id=user_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/sessions/{session_id}/events", response_model=list[AgentEventResponse])
async def list_agent_session_events(session_id: str, user_id: str = Query(..., min_length=1)) -> list[AgentEventResponse]:
    try:
        return await orchestrator.list_session_events(session_id=session_id, user_id=user_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/projects/{project_id}", response_model=AgentDeleteResponse)
async def delete_agent_project(project_id: str, user_id: str = Query(..., min_length=1)) -> AgentDeleteResponse:
    try:
        await orchestrator.delete_project(project_id=project_id, user_id=user_id)
        return AgentDeleteResponse(deleted=True)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/sessions/{session_id}/message", response_model=AgentSessionResponse)
async def send_agent_message(session_id: str, request: AgentTurnRequest) -> AgentSessionResponse:
    try:
        return await orchestrator.handle_user_message(session_id=session_id, turn=request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
