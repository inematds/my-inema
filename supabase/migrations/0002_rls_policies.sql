-- Andaime — Row-Level Security (Phase 1)

alter table public.schools enable row level security;
alter table public.users enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.assignments enable row level security;
alter table public.attempts enable row level security;
alter table public.turns enable row level security;
alter table public.event_log enable row level security;

-- Helper: lookup current user's role
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- Helper: is user the teacher of a given class?
create or replace function public.is_class_teacher(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classes
    where id = target_class and teacher_id = auth.uid()
  );
$$;

-- Helper: is user enrolled in a given class?
create or replace function public.is_enrolled(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments
    where class_id = target_class and student_id = auth.uid()
  );
$$;

-- USERS: each user sees own profile; teachers see students of their classes
create policy "users_self_read" on public.users
  for select using (id = auth.uid());

create policy "users_teacher_read_students" on public.users
  for select using (
    exists (
      select 1 from public.enrollments e
      join public.classes c on c.id = e.class_id
      where e.student_id = public.users.id and c.teacher_id = auth.uid()
    )
  );

create policy "users_self_update" on public.users
  for update using (id = auth.uid());

-- CLASSES: teachers manage own; students read classes they're enrolled in
create policy "classes_teacher_all" on public.classes
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy "classes_student_read" on public.classes
  for select using (public.is_enrolled(id));

-- ENROLLMENTS: teachers manage; students read own
create policy "enrollments_teacher_all" on public.enrollments
  for all using (public.is_class_teacher(class_id))
  with check (public.is_class_teacher(class_id));

create policy "enrollments_student_read_own" on public.enrollments
  for select using (student_id = auth.uid());

-- ASSIGNMENTS: teacher of class writes; enrolled students read
create policy "assignments_teacher_all" on public.assignments
  for all using (public.is_class_teacher(class_id))
  with check (public.is_class_teacher(class_id));

create policy "assignments_student_read" on public.assignments
  for select using (public.is_enrolled(class_id));

-- ATTEMPTS: student owns own; teacher of class reads
create policy "attempts_student_own" on public.attempts
  for all using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "attempts_teacher_read" on public.attempts
  for select using (
    exists (
      select 1 from public.assignments a
      where a.id = public.attempts.assignment_id
        and public.is_class_teacher(a.class_id)
    )
  );

-- TURNS: student of attempt writes/reads; teacher of class reads
create policy "turns_student_own" on public.turns
  for all using (
    exists (
      select 1 from public.attempts at
      where at.id = public.turns.attempt_id and at.student_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.attempts at
      where at.id = public.turns.attempt_id and at.student_id = auth.uid()
    )
  );

create policy "turns_teacher_read" on public.turns
  for select using (
    exists (
      select 1 from public.attempts at
      join public.assignments a on a.id = at.assignment_id
      where at.id = public.turns.attempt_id
        and public.is_class_teacher(a.class_id)
    )
  );

-- EVENT_LOG: write-mostly (server-side); user reads own
create policy "event_log_self_read" on public.event_log
  for select using (user_id = auth.uid());

-- SCHOOLS: any authenticated user can read (needed for join UI in Phase 5)
create policy "schools_authenticated_read" on public.schools
  for select using (auth.role() = 'authenticated');
