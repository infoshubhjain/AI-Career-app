# AI Career App

## Roadmap Reuse System (Supabase + pgvector)

The roadmap pipeline now supports reuse before generation:

1. Normalize career goal with `gpt-4o-mini`.
2. Embed normalized title with `text-embedding-3-small`.
3. Search similar roadmaps in Supabase Postgres + pgvector.
4. Return existing roadmap when match distance is under threshold.
5. Otherwise generate roadmap and upsert it to Supabase.

## Backend Modules

- `backend/agents/roadmap/service.py`
- `backend/services/career_normalizer.py`
- `backend/services/roadmap_retriever.py`
- `backend/services/roadmap_storage.py`
- `backend/services/supabase_client.py`
- `backend/utils/embeddings.py`
- `supabase/migrations/003_roadmap_library_vector.sql`

## Environment Variables

Set in `backend/.env`:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ROADMAP_MATCH_THRESHOLD` (e.g. `0.1`)

## Supabase Setup + Local PostgreSQL Cleanup

See:

- `POSTGRES_SETUP.md`

## Retrieval Response Behavior

When a roadmap already exists, API returns:

```json
{
  "roadmap": {"query": "...", "domains": []},
  "existing": true
}
```

The `/roadmap` page displays: `Roadmap already exists.`
