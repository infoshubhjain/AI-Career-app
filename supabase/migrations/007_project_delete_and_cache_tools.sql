create or replace function public.delete_project_runtime(
  in_project_id uuid,
  in_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.projects
  where id = in_project_id
    and user_id = in_user_id;

  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

create or replace function public.delete_roadmap_library_entry(
  in_career_title text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.roadmap_library
  where career_title = in_career_title;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
