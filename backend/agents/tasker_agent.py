"""Task decomposition agent for converting skills into teachable lesson units."""

from __future__ import annotations

from agents.base import BaseAgent
from agents.runtime.types import AgentContext, AgentDecision


TASKER_PROMPT = """
You are the Tasker Agent for a career-learning system.
Break a single skill into a small ordered sequence of lecture-sized concepts.
Keep outputs practical and implementation-oriented.
Return 'final' with `state_patch.lesson_plan`.
Each lesson item should include: id, title, objective.
Generate 2-4 concepts only.
"""


class TaskerAgent(BaseAgent):
    def __init__(self) -> None:
        super().__init__(name="tasker_agent", instruction=TASKER_PROMPT, tools=[])

    async def build_plan(self, context: AgentContext) -> AgentDecision:
        return await self.run(context)
