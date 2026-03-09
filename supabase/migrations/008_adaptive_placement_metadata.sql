alter table public.agent_quizzes
  add column if not exists concept_id text,
  add column if not exists difficulty text,
  add column if not exists placement_stage text,
  add column if not exists question_fingerprint text not null default '',
  add column if not exists attempt_number integer not null default 1;

alter table public.agent_quiz_attempts
  add column if not exists assessment text,
  add column if not exists confidence double precision,
  add column if not exists mastery_before double precision,
  add column if not exists mastery_after double precision;
