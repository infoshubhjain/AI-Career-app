# Roadmap Agent

Location:

- `backend/agents/roadmap/service.py`

## Purpose

The roadmap pipeline turns the user's goal into a structured roadmap of domains and skills before any placement or teaching begins.

## Current Pipeline

1. Normalize the requested career or goal
2. Attempt retrieval from stored roadmap data
3. If a close match exists, reuse it
4. Otherwise generate domains
5. Generate skills for each domain
6. Normalize ids, descriptions, and ordering
7. Return a `RoadmapResponse`

## Output Shape

The returned roadmap is organized as:

- `query`
- `domains[]`
- each domain contains `subdomains[]`
- each subdomain is treated as a skill by the learning orchestrator

## Quality Rules

The service retries generation up to three times per stage and checks shape quality before accepting the output.

Important current rules:

- domain generation must produce a parseable roadmap structure
- skill generation aims for 8 skills per domain
- if quality checks still fail after retries, the service returns the best parseable result instead of failing hard

## How The Orchestrator Uses It

`LearningOrchestrator.create_session()` calls `RoadmapAgent.generate(query=query)` before creating the project and session.

The resulting roadmap is then used to:

- seed `state.roadmap_progress`
- flatten skills into a placement search space
- determine the learner's initial frontier
- drive later teaching and quiz progression

## Provider Configuration

Provider and model configuration lives in `backend/config.yaml`.

Current defaults:

- provider: `openai`
- roadmap model: `gpt-5-mini`

## Notes

This roadmap document is current for the refactored orchestration runtime. Older broad documentation has been moved under `docs/archive/`.
