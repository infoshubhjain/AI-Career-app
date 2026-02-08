-- Users table (extends Supabase auth.users)
-- This table is for public profile info
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  xp integer default 0,
  streak_days integer default 0,
  current_level integer default 1,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Career roadmaps (stored as JSON)
create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  goal text not null,
  full_roadmap jsonb not null,
  current_step integer default 0,
  status text default 'active',
  created_at timestamptz default now()
);

alter table public.roadmaps enable row level security;

create policy "Users can view their own roadmaps." on public.roadmaps
  for select using (auth.uid() = user_id);

create policy "Users can insert their own roadmaps." on public.roadmaps
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own roadmaps." on public.roadmaps
  for update using (auth.uid() = user_id);

-- Chat messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid references public.roadmaps not null,
  user_id uuid references public.profiles not null,
  role text not null, -- 'user' or 'assistant'
  content text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Users can view their own messages." on public.messages
  for select using (auth.uid() = user_id);

create policy "Users can insert their own messages." on public.messages
  for insert with check (auth.uid() = user_id);

-- Quiz results
create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  roadmap_id uuid references public.roadmaps,
  skill_assessed text,
  score numeric,
  responses jsonb,
  created_at timestamptz default now()
);

alter table public.quiz_results enable row level security;

create policy "Users can view their own quiz results." on public.quiz_results
  for select using (auth.uid() = user_id);

create policy "Users can insert their own quiz results." on public.quiz_results
  for insert with check (auth.uid() = user_id);
