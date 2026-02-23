# AI Career App

Monorepo with:
- FastAPI backend (`/backend`)
- Next.js frontend (`/frontend`)
- Two-stage roadmap agent (`/backend/agents/roadmap`)

## Quick Start

```bash
./setup.sh
./launch.sh
```

Or combined:

```bash
./setup_and_launch.sh
```

## Provider Selection

LLM provider is selected in:
- `backend/config.yaml`

Current default:
- `openai`

Supported providers:
- `openai`
- `google`
- `openrouter`

## Environment

Backend keys are read from:
- `backend/.env`

Frontend keys are read from:
- `frontend/.env.local`

Scripts print status for required Supabase and AI keys at launch.
