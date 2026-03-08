"""API endpoints for the multi-agent coaching runtime."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from agents.orchestrator import LearningOrchestrator
from app.models.agent import AgentSessionCreateRequest, AgentSessionResponse, AgentSessionStateResponse, AgentTurnRequest


router = APIRouter(prefix="/api/agent", tags=["Agent"])
orchestrator = LearningOrchestrator()


@router.post("/sessions", response_model=AgentSessionResponse)
async def create_agent_session(request: AgentSessionCreateRequest) -> AgentSessionResponse:
    try:
        return await orchestrator.create_session(user_id=request.user_id, query=request.query)
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


@router.post("/sessions/{session_id}/message", response_model=AgentSessionResponse)
async def send_agent_message(session_id: str, request: AgentTurnRequest) -> AgentSessionResponse:
    try:
        return await orchestrator.handle_user_message(session_id=session_id, user_id=request.user_id, message=request.message)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
