-- MVP: any authenticated user can create a school (the first one becomes
-- the default school for the teacher's classes). In production this should
-- be admin-only.

create policy "schools_authenticated_insert" on public.schools
  for insert
  with check (auth.role() = 'authenticated');
