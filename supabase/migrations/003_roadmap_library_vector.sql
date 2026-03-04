-- Shared roadmap library for reuse across users
create extension if not exists vector;

create table if not exists public.roadmap_library (
  id bigserial primary key,
  career_title text not null unique,
  embedding vector(1536) not null,
  roadmap_json jsonb not null,
  created_at timestamptz default now()
);

create index if not exists idx_roadmap_library_embedding
on public.roadmap_library
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

create or replace function public.match_roadmap_library(
  query_embedding text,
  match_count int default 10
)
returns table(
  id bigint,
  career_title text,
  roadmap_json jsonb,
  distance double precision
)
language sql
stable
as $$
  select
    rl.id,
    rl.career_title,
    rl.roadmap_json,
    (rl.embedding <-> query_embedding::vector) as distance
  from public.roadmap_library rl
  order by rl.embedding <-> query_embedding::vector
  limit match_count;
$$;

create or replace function public.upsert_roadmap_library(
  in_career_title text,
  in_embedding text,
  in_roadmap_json jsonb
)
returns void
language sql
as $$
  insert into public.roadmap_library (career_title, embedding, roadmap_json)
  values (in_career_title, in_embedding::vector, in_roadmap_json)
  on conflict (career_title)
  do update set
    embedding = excluded.embedding,
    roadmap_json = excluded.roadmap_json,
    created_at = now();
$$;
