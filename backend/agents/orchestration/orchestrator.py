"""Composed learning orchestrator built from focused orchestration mixins."""

from __future__ import annotations

from agents.conversation_agent import ConversationAgent
from agents.knowledge_agent import KnowledgeAgent
from agents.memory_agent import MemoryCompactorAgent
from agents.orchestration.conversation_flow import ConversationFlowMixin
from agents.orchestration.core_state import CoreStateMixin
from agents.orchestration.placement_flow import PlacementFlowMixin
from agents.orchestration.progression import ProgressionMixin
from agents.orchestration.quiz_runtime import QuizRuntimeMixin
from agents.orchestration.runtime_api import RuntimeApiMixin
from agents.quiz_agent import QuizAgent
from agents.roadmap import RoadmapAgent
from agents.tasker_agent import TaskerAgent
from services.agent_session_store import AgentSessionStore
from services.bkt_engine import BKTEngine
from services.knowledge_state_store import KnowledgeStateStore


class LearningOrchestrator(
    RuntimeApiMixin,
    PlacementFlowMixin,
    ProgressionMixin,
    QuizRuntimeMixin,
    ConversationFlowMixin,
    CoreStateMixin,
):
    """Coordinates roadmap generation, placement, instruction, quizzes, and persistence."""

    def __init__(self) -> None:
        self.roadmap_agent = RoadmapAgent()
        self.tasker_agent = TaskerAgent()
        self.conversation_agent = ConversationAgent()
        self.knowledge_agent = KnowledgeAgent()
        self.memory_agent = MemoryCompactorAgent()
        self.quiz_agent = QuizAgent()
        self.store = AgentSessionStore()
        self.bkt_engine = BKTEngine()
        self.knowledge_store = KnowledgeStateStore(self.store, self.bkt_engine)
