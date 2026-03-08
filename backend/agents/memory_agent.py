"""Memory compaction agent for pruning completed lesson context."""

from __future__ import annotations

from agents.base import BaseAgent
from agents.runtime.types import AgentContext, AgentDecision


MEMORY_PROMPT = """
You summarize completed learning interactions into compact, reusable memory.
Capture what the user demonstrated, what they struggled with, and what the next agent should remember.
Return 'final' with `state_patch.memory_summary`.
Keep the summary under 200 words.
"""


class MemoryCompactorAgent(BaseAgent):
    def __init__(self) -> None:
        super().__init__(name="memory_compactor_agent", instruction=MEMORY_PROMPT, tools=[])

    async def compact(self, context: AgentContext) -> AgentDecision:
        return await self.run(context)
