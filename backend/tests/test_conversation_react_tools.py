"""Tests for ReAct conversation tools (p5_sketch, web_search path) and prompt metadata."""

from __future__ import annotations

from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agents.base import BaseAgent
from agents.conversation_agent import ConversationAgent, P5_SKETCH_MAX_CHARS, validate_p5_sketch_code
from agents.runtime.types import AgentContext, ToolDefinition
from app.models.agent import AgentTurnRequest


def test_validate_p5_sketch_code_accepts_global_sketch() -> None:
    code = """
function setup() {
  createCanvas(400, 400);
}
function draw() {
  background(220);
}
"""
    assert validate_p5_sketch_code(code) is None


def test_validate_p5_sketch_code_rejects_missing_setup() -> None:
    err = validate_p5_sketch_code("function draw() { line(0,0,9,9); }")
    assert err is not None
    assert "setup" in err.lower()


def test_validate_p5_sketch_code_rejects_empty() -> None:
    assert validate_p5_sketch_code("") is not None
    assert validate_p5_sketch_code("   ") is not None


def test_validate_p5_sketch_code_rejects_too_long() -> None:
    code = "function setup() {}\nfunction draw() {}\n" + ("x" * P5_SKETCH_MAX_CHARS)
    err = validate_p5_sketch_code(code)
    assert err is not None


@pytest.mark.asyncio
async def test_p5_sketch_tool_returns_ok() -> None:
    agent = ConversationAgent()
    out = await agent._p5_sketch(
        {"code": "function setup() {}\nfunction draw() {}", "title": "Demo"}
    )
    assert out["ok"] is True
    assert out["title"] == "Demo"


def test_base_agent_metadata_prompt_omits_callable_tool_host() -> None:
    async def _noop(_p: dict) -> dict:
        return {}

    agent = BaseAgent(
        name="t",
        instruction="test",
        tools=[
            ToolDefinition(
                name="x",
                description="d",
                input_schema={"type": "object"},
                handler=_noop,
            )
        ],
    )
    ctx = AgentContext(
        session_id="s",
        user_id="u",
        user_message="hi",
        state={},
        metadata={"tool_host": {"request_next_quiz": _noop}, "stage": "st"},
    )
    messages = agent._build_messages(context=ctx, scratchpad=[])
    user = messages[1]["content"]
    assert "tool_host" in user
    assert "injected at runtime" in user
    assert "def " not in user


def test_agent_turn_request_quiz_ready_allows_empty_message() -> None:
    turn = AgentTurnRequest(user_id="user-1", message=None, input_mode="quiz_ready")
    assert turn.input_mode == "quiz_ready"
