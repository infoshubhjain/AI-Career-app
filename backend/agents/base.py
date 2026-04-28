"""Base ReAct agent used by higher-level orchestration agents."""

from __future__ import annotations

import json
from typing import Any

from app.core.config import settings
from app.core.logging import AgentLogger
from agents.runtime.providers import ProviderRouter
from agents.runtime.types import AgentContext, AgentDecision, ToolDefinition, ToolExecution


class BaseAgent:
    """Minimal ReAct loop with JSON actions and explicit tool execution."""

    def __init__(
        self,
        *,
        name: str,
        instruction: str,
        tools: list[ToolDefinition] | None = None,
        llm: ProviderRouter | None = None,
    ) -> None:
        self.name = name
        self.instruction = instruction.strip()
        self.tools = tools or []
        self.tool_map = {tool.name: tool for tool in self.tools}
        self.llm = llm or ProviderRouter()

    async def run(self, context: AgentContext) -> AgentDecision:
        scratchpad: list[dict[str, Any]] = []
        tool_trace: list[ToolExecution] = []

        for step in range(1, settings.AGENT_REACT_MAX_STEPS + 1):
            messages = self._build_messages(context=context, scratchpad=scratchpad)
            try:
                response = await self.llm.complete_json(
                    messages,
                    max_tokens=2500,
                    request_id=context.metadata.get("request_id"),
                    agent_name=self.name,
                    step=step,
                )
            except Exception as exc:  # noqa: BLE001
                AgentLogger.error(
                    event="agent_llm_error",
                    component=self.name,
                    session_id=context.session_id,
                    error=str(exc),
                    step=step,
                )
                return AgentDecision(status="failed", message=str(exc), tool_trace=tool_trace)

            action = str(response.get("action", "final")).strip()
            action_input = response.get("action_input") or {}
            message = str(response.get("message", "")).strip()
            state_patch = response.get("state_patch") or {}
            metadata = response.get("metadata") or {}

            if action == "final":
                return AgentDecision(
                    status="completed",
                    message=message,
                    state_patch=state_patch,
                    tool_trace=tool_trace,
                    metadata=metadata,
                )

            if action == "pause":
                pending = response.get("pending_questions") or []
                return AgentDecision(
                    status="awaiting_user",
                    message=message,
                    state_patch=state_patch,
                    pending_questions=pending,
                    tool_trace=tool_trace,
                    metadata=metadata,
                )

            tool = self.tool_map.get(action)
            if tool is None:
                return AgentDecision(
                    status="failed",
                    message=f"{self.name} requested unknown action '{action}'",
                    tool_trace=tool_trace,
                )

            tool_output = await tool.handler(action_input)
            tool_trace.append(ToolExecution(name=tool.name, tool_input=action_input, tool_output=tool_output))
            scratchpad.append(
                {
                    "thought": response.get("thought", ""),
                    "action": action,
                    "action_input": action_input,
                    "observation": tool_output,
                }
            )

        return AgentDecision(
            status="failed",
            message=f"{self.name} exceeded max ReAct steps",
            tool_trace=tool_trace,
        )

    def _build_messages(self, *, context: AgentContext, scratchpad: list[dict[str, Any]]) -> list[dict[str, str]]:
        tool_block = json.dumps(
            [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.input_schema,
                }
                for tool in self.tools
            ],
            indent=2,
        )
        scratchpad_text = json.dumps(scratchpad, indent=2, ensure_ascii=False)
        state_text = json.dumps(context.state, indent=2, ensure_ascii=False)
        metadata_for_prompt = {
            k: v
            for k, v in (context.metadata or {}).items()
            if not callable(v) and not (isinstance(v, dict) and any(callable(x) for x in v.values()))
        }
        if (context.metadata or {}).get("tool_host"):
            metadata_for_prompt["tool_host"] = (
                "injected at runtime (e.g. request_next_quiz when the session is awaiting topic-quiz consent)"
            )
        metadata_text = json.dumps(metadata_for_prompt, indent=2, ensure_ascii=False)

        user_prompt = (
            "Session context:\n"
            f"{state_text}\n\n"
            "Invocation metadata:\n"
            f"{metadata_text}\n\n"
            "Latest user message:\n"
            f"{context.user_message}\n\n"
            "Tool trace so far:\n"
            f"{scratchpad_text}\n"
        )

        system_prompt = (
            f"{self.instruction}\n\n"
            "All user-facing content must be valid Markdown. Use headings, lists, tables, blockquotes, and fenced code blocks when helpful.\n\n"
            "You are operating in a strict ReAct runtime.\n"
            "Available tools:\n"
            f"{tool_block}\n\n"
            "Return JSON only with this shape:\n"
            "{\n"
            '  "thought": "brief internal reasoning",\n'
            '  "action": "tool_name | pause | final",\n'
            '  "action_input": {},\n'
            '  "message": "user-facing response text",\n'
            '  "pending_questions": [],\n'
            '  "state_patch": {},\n'
            '  "metadata": {}\n'
            "}\n"
            "Use 'pause' when you need the user to answer questions before continuing.\n"
            "Use 'final' only when you have a complete response for the current orchestration stage.\n"
        )

        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
