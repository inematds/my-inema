-- Slice 7 — Painel pedagógico do professor.
--
-- "Featured attempt" = professor pode destacar um trabalho da aula que vira
-- referência pros colegas. NULLable: zero ou um destaque por assignment.

alter table public.assignments
  add column featured_attempt_id uuid
    references public.attempts(id) on delete set null;

create index assignments_featured_idx
  on public.assignments (featured_attempt_id)
  where featured_attempt_id is not null;
