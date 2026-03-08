# Multi-Agent Backend Architecture

## What was added

This backend now has a dedicated multi-agent runtime layered on top of the existing roadmap generator.

New pieces:

- `backend/agents/base.py`
  Reusable ReAct-style `BaseAgent` with a strict JSON action contract.
- `backend/agents/runtime/providers.py`
  Shared LLM provider router for OpenAI, Google, and OpenRouter, driven by `backend/config.yaml`.
- `backend/agents/knowledge_agent.py`
  Human-in-the-loop knowledge assessment agent.
- `backend/agents/conversation_agent.py`
  Teaching and quiz agent with pluggable web search.
- `backend/agents/tasker_agent.py`
  Smaller decomposition agent that turns a skill into lecture-sized concepts.
- `backend/agents/memory_agent.py`
  Memory compaction agent for pruning completed context.
- `backend/agents/orchestrator.py`
  Session state machine that wires roadmap generation, knowledge calibration, lessons, quizzes, and memory together.
- `backend/services/agent_session_store.py`
  Supabase persistence for sessions, events, and compacted memories.
- `backend/services/web_search.py`
  Lightweight search adapter used by the conversation agent.
- `backend/app/api/agent.py`
  API surface for creating and continuing agent sessions.

## Runtime model

The orchestrator is the owner of application flow. The specialized agents do not directly mutate external systems. They return:

- `message`
- `state_patch`
- `pending_questions`
- `tool_trace`
- `status`

The orchestrator applies those patches to Supabase session state and decides the next stage.

This keeps agent reasoning swappable while the control flow stays deterministic.
