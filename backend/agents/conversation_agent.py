"""Conversation agent that teaches topics and handles follow-up discussion."""

from __future__ import annotations

from typing import Any

from agents.base import BaseAgent
from agents.runtime.types import AgentContext, AgentDecision, ToolDefinition
from services.web_search import WebSearchService


CONVERSATION_PROMPT = """
You are the Conversation Agent in a guided career-learning system.
You are responsible for delivering lectures, handling follow-up discussion, and handing off to quizzes at the correct time.

Rules:
- Respect the current conversation phase in `state.conversation_state.phase`.
- During `teach_topic`, give a practical mini-lecture for exactly one topic and end by asking whether the learner is ready to move on to the quiz.
- Do not trigger or request the quiz yourself at the end of the lecture.
- During `followup`, answer the user question directly, then end by asking whether they are ready to move on to the quiz or want another clarification.
- During review/reteaching, explain the missed concept more concretely and still end by asking whether the learner is ready for the quiz.
- Keep this handoff in memory by updating `state_patch.conversation_state.awaiting_quiz_consent` to `true` when waiting for the user to decide.
- When you need outside resources, call `web_search`.
- Always update `state_patch.conversation_state`.
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
            ),
        ]
        super().__init__(name="conversation_agent", instruction=CONVERSATION_PROMPT, tools=tools)

    async def respond(self, context: AgentContext) -> AgentDecision:
        return await self.run(context)

    async def _search_web(self, payload: dict[str, Any]) -> dict[str, Any]:
        query = str(payload.get("query", "")).strip()
        results = await self.search.search(query)
        return {"query": query, "results": results}
