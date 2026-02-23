-- Add last_active_at to profiles to track streaks
alter table public.profiles 
add column if not exists last_active_at timestamptz default now();
