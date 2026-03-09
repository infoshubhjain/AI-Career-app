alter table public.agent_quiz_attempts
  drop constraint if exists agent_quiz_attempts_selected_option_check;

alter table public.agent_quiz_attempts
  add constraint agent_quiz_attempts_selected_option_check
  check (selected_option_index between 0 and 4);
