-- Allow students to enroll themselves (they need the class code to find the class).
-- The class code acts as the join secret.

create policy "enrollments_student_self_enroll" on public.enrollments
  for insert
  with check (student_id = auth.uid());
