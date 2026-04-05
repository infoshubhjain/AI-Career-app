"""Conversation agent that teaches topics and handles follow-up discussion."""

from __future__ import annotations

import re
from typing import Any

from agents.base import BaseAgent
from agents.runtime.types import AgentContext, AgentDecision, ToolDefinition
from services.web_search import WebSearchService

P5_SKETCH_MAX_CHARS = 50_000

CONVERSATION_PROMPT = r"""
You are the Conversation Agent in a guided career-learning system.
You are responsible for delivering lectures, handling follow-up discussion, and handing off to quizzes at the correct time.

Rules:
- Respect the current conversation phase in `state.conversation_state.phase`.
- During `teach_topic`, give a practical mini-lecture for exactly one topic and end by asking whether the learner is ready to move on to the quiz.
- Do not trigger or request the quiz yourself at the end of the lecture.
- During `followup`, answer the user question directly, then end by asking whether they are ready to move on to the quiz or want another clarification.
- During review/reteaching, explain the missed concept more concretely and still end by asking whether the learner is ready for the quiz.
- MATHEMATICS: Always format mathematical formulas using LaTeX delimiters instead of code blocks. Use `\[ ... \]` for standalone block equations and `\( ... \)` for inline math.
- VISUALIZATIONS: When an interactive demo helps, call the `p5_sketch` tool with your draft code to validate it, then in your `final` message include the same sketch inside a ```p5 markdown code block (complete global-mode p5 with setup() and draw()).
- Keep this handoff in memory by updating `state_patch.conversation_state.awaiting_quiz_consent` to `true` when waiting for the user to decide.
- When you need outside resources, call `web_search`.
- Quiz handoff is never a tool call. When the learner is ready for the topic/task quiz, tell them to scroll to the bottom of the chat and press the **Start quiz** button (they can still ask follow-ups first; the button stays available at the bottom once they scroll down).
- Always update `state_patch.conversation_state`.

LEARNING STYLE ADAPTATION:
Check `state.learning_style` and adapt every response accordingly:
- "text": Use rich written explanations with code snippets, bullet-point summaries, analogies, and markdown formatting.
- "video": Keep written content brief and scannable. Always include 1-2 curated YouTube or video resource recommendations (use web_search to find them). Use visual metaphors.
- "both": Provide a solid written explanation AND suggest 1 relevant video resource via web_search. Balance depth of text with multimedia pointers.
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
            ToolDefinition(
                name="p5_sketch",
                description=(
                    "Validate draft p5.js code before you put it in the user-facing message. "
                    "Pass global-mode code with setup() and draw(). On success, echo the code in a ```p5 block in your final answer."
                ),
                input_schema={
                    "type": "object",
                    "properties": {
                        "code": {"type": "string", "description": "Raw p5.js sketch source."},
                        "title": {"type": "string", "description": "Short label for the sketch (optional)."},
                    },
                    "required": ["code"],
                },
                handler=self._p5_sketch,
            ),
        ]
        super().__init__(name="conversation_agent", instruction=CONVERSATION_PROMPT, tools=tools)

    async def respond(self, context: AgentContext) -> AgentDecision:
        return await self.run(context)

    async def _search_web(self, payload: dict[str, Any]) -> dict[str, Any]:
        query = str(payload.get("query", "")).strip()
        results = await self.search.search(query)
        return {"query": query, "results": results}

    async def _p5_sketch(self, payload: dict[str, Any]) -> dict[str, Any]:
        title = str(payload.get("title", "")).strip()
        code = str(payload.get("code", "")).strip()
        err = validate_p5_sketch_code(code)
        if err:
            return {"ok": False, "error": err}
        return {
            "ok": True,
            "title": title or None,
            "char_count": len(code),
            "reminder": "Put this exact sketch in your final message inside a ```p5 fenced code block.",
        }


def validate_p5_sketch_code(code: str) -> str | None:
    """Return an error message if invalid, or None if ok."""
    if not code.strip():
        return "code is required and cannot be empty"
    if len(code) > P5_SKETCH_MAX_CHARS:
        return f"code must be at most {P5_SKETCH_MAX_CHARS} characters"
    if not re.search(r"\bsetup\s*\(", code):
        return "code must define setup() (e.g. function setup() { ... } or setup() { ... })"
    if not re.search(r"\bdraw\s*\(", code):
        return "code must define draw() (e.g. function draw() { ... } or draw() { ... })"
    return None
