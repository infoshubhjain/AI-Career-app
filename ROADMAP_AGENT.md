# Roadmap Agent

Location:
- `backend/agents/roadmap`

## Pipeline

1. Domain generation
- Input: user career/goal query
- Output: 6-12 domains
- Order: chronological from beginner to highly advanced

2. Skill generation
- Input: generated domains
- Output: 8 skills/subdomains per domain
- Order: chronological within each domain

## Fallback behavior

- Each stage retries up to 3 times.
- If stage 2 quality constraints are not fully met after retries, returns best parseable output instead of failing hard.

## Provider configuration

- `backend/config.yaml` controls provider + model mapping.
- API keys come from `backend/.env`.
