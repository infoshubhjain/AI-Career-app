"""Shared runtime types for the multi-agent orchestration layer."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Literal


ToolHandler = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]


@dataclass(slots=True)
class ToolDefinition:
    """Declarative tool description exposed to a ReAct agent."""

    name: str
    description: str
    input_schema: dict[str, Any]
    handler: ToolHandler


@dataclass(slots=True)
class ToolExecution:
    """Captures a single tool call and its output."""

    name: str
    tool_input: dict[str, Any]
    tool_output: dict[str, Any]


@dataclass(slots=True)
class AgentDecision:
    """Normalized result of an agent invocation."""

    status: Literal["completed", "awaiting_user", "failed"]
    message: str
    state_patch: dict[str, Any] = field(default_factory=dict)
    pending_questions: list[dict[str, Any]] = field(default_factory=list)
    tool_trace: list[ToolExecution] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class AgentContext:
    """Minimal invocation context shared across agents."""

    session_id: str
    user_id: str
    user_message: str
    state: dict[str, Any]
    metadata: dict[str, Any] = field(default_factory=dict)
