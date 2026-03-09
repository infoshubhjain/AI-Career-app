# Documentation

This folder is the home for project documentation that describes the current runtime and preserves older reference material.

## Current Runtime

- `docs/agent-runtime-overview.md`: End-to-end runtime walkthrough from chat UI to backend orchestration, persistence, teaching, and quizzes.
- `docs/initial-quiz-and-placement.md`: Detailed explanation of the initial quiz flow, adaptive placement loop, and how the system decides the learner's frontier.
- `docs/backend/roadmap-agent.md`: Focused notes on roadmap generation and reuse.

## Legacy / Reference

- `docs/archive/legacy-ai-setup.md`: Older setup notes from the earlier AI chat implementation.
- `docs/archive/legacy-debugging-guide.md`: Older debugging and local setup notes retained for reference.
- `docs/archive/legacy-master-documentation.md`: Earlier broad project summary retained as historical context.

## Where To Start

If you want to understand the current learning flow, read these in order:

1. `docs/agent-runtime-overview.md`
2. `docs/initial-quiz-and-placement.md`
3. `backend/agents/orchestration/`

## Current Source Of Truth

For the live runtime, the most important implementation files are:

- `frontend/app/chat/page.tsx`
- `frontend/app/lib/agent-api.ts`
- `backend/app/api/agent.py`
- `backend/agents/orchestration/runtime_api.py`
- `backend/agents/orchestration/core_state.py`
- `backend/agents/orchestration/quiz_runtime.py`
- `backend/agents/orchestration/placement_flow.py`
- `backend/agents/orchestration/conversation_flow.py`
- `backend/services/agent_session_store.py`
