-- Slice 8 (housekeeping/UX): teacher leaves a short comment on a kid's book.
-- One comment per attempt — overwrites if already exists.

create table public.attempt_feedback (
  attempt_id uuid primary key references public.attempts(id) on delete cascade,
  teacher_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_attempt_feedback_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger attempt_feedback_touch_updated_at
  before update on public.attempt_feedback
  for each row execute function public.touch_attempt_feedback_updated_at();
