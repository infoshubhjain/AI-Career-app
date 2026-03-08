"""Conversation agent that teaches, quizzes, and uses web search."""

from __future__ import annotations

from typing import Any

from agents.base import BaseAgent
from agents.runtime.types import AgentContext, AgentDecision, ToolDefinition
from services.web_search import WebSearchService


CONVERSATION_PROMPT = """
You are the Conversation Agent in a guided career-learning system.
Teach the current topic practically, using external resources when helpful.
At the end of each teaching step, ask whether the user has questions before the quiz.
When grading, explain why the answer is right or wrong, then decide whether to move on or review.
When you need outside resources, call `web_search`.
Always update `state_patch.conversation_state`.
"""


class ConversationAgent(BaseAgent):
    def __init__(self) -> None:
        self.search = WebSearchService()
        tools = [
            ToolDefinition(
                name="web_search",
                description="Search the web for fresh resources or references.",
                input_schema={
                    "type": "object",
                    "properties": {"query": {"type": "string"}},
                    "required": ["query"],
                },
                handler=self._search_web,
            )
        ]
        super().__init__(name="conversation_agent", instruction=CONVERSATION_PROMPT, tools=tools)

    async def respond(self, context: AgentContext) -> AgentDecision:
        return await self.run(context)

    async def _search_web(self, payload: dict[str, Any]) -> dict[str, Any]:
        query = str(payload.get("query", "")).strip()
        results = await self.search.search(query)
        return {"query": query, "results": results}
