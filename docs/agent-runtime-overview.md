# Agent Runtime Overview

This document explains the current end-to-end runtime for the learning experience in the app, starting at the chat UI and ending in the backend orchestration pipeline.

## High-Level Architecture

The runtime is split into four layers:

1. Frontend chat UI in `frontend/app/chat/page.tsx`
2. Frontend API client in `frontend/app/lib/agent-api.ts`
3. FastAPI agent endpoints in `backend/app/api/agent.py`
4. Backend orchestration and persistence in `backend/agents/orchestration/` and `backend/services/agent_session_store.py`

The central coordinator is `LearningOrchestrator`, composed from mixins in `backend/agents/orchestration/orchestrator.py`.

## Main Agents And Responsibilities

- `RoadmapAgent`: Generates or reuses a roadmap for the user's goal.
- `KnowledgeAgent`: Plans the next probe concept and difficulty for the skill selected by the BKT layer.
- `QuizAgent`: Turns the planned probe, topic, or domain into a four-option multiple-choice question.
- `ConversationAgent`: Teaches topics, handles follow-up questions, and hands off to quizzes.
- `TaskerAgent`: Breaks a frontier skill into a small lesson plan.
- `MemoryCompactorAgent`: Summarizes finished topic history into durable memory.
- `BKTEngine`: Updates skill mastery probabilities and computes information gain / frontier heuristics.
- `KnowledgeStateStore`: Persists durable global and project-local skill probabilities in Supabase.
- `LearningOrchestrator`: Owns session state, status transitions, quiz persistence, and routing between agents.

## Session Creation Pipeline

When the user starts a new project from the chat page:

1. `frontend/app/chat/page.tsx` calls `createAgentSession()`.
2. `frontend/app/lib/agent-api.ts` sends `POST /api/agent/sessions`.
3. `backend/app/api/agent.py` forwards the request to `LearningOrchestrator.create_session()`.
4. `backend/agents/orchestration/runtime_api.py` calls `RoadmapAgent.generate(query=query)`.
5. The orchestrator creates:
   - a `projects` row
   - an `agent_sessions` row
   - initial `agent_events`
6. The orchestrator seeds durable BKT state for every roadmap skill:
   - global user skill priors in `user_skill_knowledge`
   - project-local overlays in `project_skill_knowledge`
7. The orchestrator seeds the runtime state with:
   - learner profile state
   - placement state
   - conversation state
   - roadmap progress
   - quiz pointers

If the user already has a saved `reading_level` in `profiles`, the system skips the profile question and starts placement immediately. Otherwise, it returns a profile multiple-choice question first.

## The Runtime State Model

The session `state` is now a working cache for orchestration and UI. Durable knowledge state lives in Supabase tables. Important branches:

- `learner_profile`: Stores `reading_level`
- `profile_answers`: Stores onboarding answers
- `knowledge_state`: Tracks current probe, current frontier summary, skill probability summaries, and per-skill local history
- `placement_state`: Tracks BKT-driven placement progress, question budget, selection metadata, and placement history
- `conversation_state`: Tracks whether the system is teaching, waiting for follow-up, or waiting for quiz consent
- `roadmap_progress`: Points to the current domain and skill
- `lesson_plan`: The current topic sequence for the frontier skill
- `active_quiz_id`: The active persisted quiz row, if any

## Quiz Lifecycle

Every quiz follows the same storage pattern:

1. The orchestrator calls `_create_quiz()` in `backend/agents/orchestration/quiz_runtime.py`.
2. `QuizAgent.generate()` returns prompt, options, answer key, focus, concept id, and difficulty.
3. The orchestrator persists the quiz into `agent_quizzes`.
4. The returned API response includes `pending_questions`.
5. The frontend opens `QuizOverlay`.
6. The user selects an option.
7. The frontend sends a `multiple_choice` turn with:
   - `question_id`
   - `selected_option_id`
   - `selected_option_index`
8. The orchestrator resolves the active quiz, scores it algorithmically against the stored answer key, updates BKT posteriors, records the attempt, updates session state, and returns the next assistant message plus the next pending question if another quiz is required.

## Teaching Pipeline After Placement

Once placement ends, the runtime switches from calibration to teaching:

1. `PlacementFlowMixin._finalize_learning_frontier()` identifies the frontier skill.
2. `TaskerAgent` breaks that skill into a short lesson plan.
3. `ConversationAgent` delivers the current topic.
4. The session moves to `awaiting_topic_followup`.
5. The learner can:
   - ask follow-up questions, or
   - say `ready` to start the topic quiz
6. `QuizAgent` creates a `topic_quiz`.
7. If the learner misses it, the system reteaches the topic and asks a new question.
8. If the learner passes all topics for the skill, the runtime either:
   - starts a domain quiz when a domain was finished, or
   - restarts placement around the next skill

## Persistence Model

`AgentSessionStore` and `KnowledgeStateStore` write the runtime into Supabase-backed tables:

- `projects`
- `agent_sessions`
- `agent_events`
- `agent_memories`
- `agent_quizzes`
- `agent_quiz_attempts`
- `user_skill_knowledge`
- `project_skill_knowledge`
- `user_skill_observations`
- `profiles`

This lets the frontend reopen a project and reconstruct:

- the latest session
- the transcript
- the active/pending quiz
- roadmap and runtime state

## Important Status Values

The most important session statuses are:

- `awaiting_profile`
- `awaiting_knowledge_answer`
- `reviewing_topic`
- `awaiting_topic_followup`
- `awaiting_topic_quiz`
- `awaiting_domain_quiz`
- `reviewing_domain`
- `completed`

The frontend uses these statuses, plus `pending_questions` and `state.active_quiz_id`, to decide whether to show the quiz overlay and disable freeform input.

## Important Implementation Detail

The current runtime is BKT-driven:

- the `KnowledgeAgent` plans probe content
- the `QuizAgent` authors the question and answer key
- the orchestrator checks correctness algorithmically
- `BKTEngine` updates the posterior probability for the targeted skill
- `KnowledgeStateStore` selects the next most revealing skill using expected information gain

This means question authoring is still AI-generated, but knowledge estimation is algorithmic and durable across sessions and projects.

For the detailed initial quiz and placement loop, see `docs/initial-quiz-and-placement.md`.
