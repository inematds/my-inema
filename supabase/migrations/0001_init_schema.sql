-- Andaime — initial schema (Phase 1)

create extension if not exists "pgcrypto";

-- Roles enum
create type public.user_role as enum ('admin', 'teacher', 'student');

-- Schools
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- App users (mirrors auth.users with profile data)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role public.user_role not null default 'student',
  school_id uuid references public.schools(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Classes (a teacher's group of students)
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid not null references public.users(id) on delete restrict,
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now()
);

-- Enrollments (student ↔ class)
create table public.enrollments (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

-- Assignments (Phase 2 will populate; defined now so RLS exists)
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  prompt text not null,
  criteria text,
  max_hints int not null default 3,
  min_initial_chars int not null default 200,
  created_at timestamptz not null default now()
);

-- Attempts (one per student per assignment)
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'transferred')),
  autonomy_score numeric,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (assignment_id, student_id)
);

-- Turns (every message in the attempt — student or AI)
create table public.turns (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  author text not null check (author in ('student', 'ai', 'system')),
  kind text not null check (kind in ('initial', 'question', 'hint', 'feedback', 'revision', 'final', 'transfer')),
  content text not null,
  tokens_used int,
  created_at timestamptz not null default now()
);

-- Audit log (pedagogical event stream)
create table public.event_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  attempt_id uuid references public.attempts(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Trigger: auto-insert into public.users when auth.users gets a row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Indexes
create index idx_enrollments_student on public.enrollments(student_id);
create index idx_attempts_student on public.attempts(student_id);
create index idx_attempts_assignment on public.attempts(assignment_id);
create index idx_turns_attempt on public.turns(attempt_id, created_at);
create index idx_event_log_attempt on public.event_log(attempt_id, created_at);
