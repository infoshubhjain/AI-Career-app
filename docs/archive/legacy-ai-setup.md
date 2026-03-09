# Legacy AI Setup Guide

This file preserves the intent of the older root-level `AI_SETUP.md`.

## Context

These notes describe an earlier AI chat setup that referenced the older frontend chat route and a mock-mode workflow. Parts of it may no longer match the current server-driven agent runtime.

## Main Topics Covered

- enabling mock mode vs real AI mode
- adding an OpenAI API key
- running the frontend locally
- testing the older `/api/chat` route
- basic feature validation for chat and quizzes

## Important Caveat

The current architecture now routes learning sessions through:

- `frontend/app/lib/agent-api.ts`
- `backend/app/api/agent.py`
- `backend/agents/orchestration/`

Use the docs in `docs/` as the current source of truth, and treat this file as historical reference only.
