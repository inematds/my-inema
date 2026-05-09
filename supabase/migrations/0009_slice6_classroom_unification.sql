-- Slice 6 — Junior dentro do classroom + modelo C (sem anônimo, mural sala+global).
--
-- 1. assignments ganham um discriminator de tipo de aula. Existing rows = 'essay'.
--    Novos verticais entram aqui sem nova tabela por tipo.
-- 2. junior_books amarram numa attempt (1:1) e ganham escopo de publicação.
--    session_token (cookie anônimo) vira opcional — Junior agora exige login.

alter table public.assignments
  add column lesson_type text not null default 'essay';

create index assignments_lesson_type_idx on public.assignments (lesson_type);

alter table public.junior_books
  add column attempt_id uuid references public.attempts(id) on delete cascade,
  add column published_scope text not null default 'global'
    check (published_scope in ('class', 'global'));

-- 1 attempt = 1 book.
create unique index junior_books_attempt_unique
  on public.junior_books (attempt_id) where attempt_id is not null;

-- session_token agora é opcional (livros novos chegam por user_id ou attempt_id).
-- Mantém unicidade só para tokens não-nulos (legacy reads).
alter table public.junior_books
  alter column session_token drop not null;

alter table public.junior_books
  drop constraint if exists junior_books_session_token_key;

create unique index if not exists junior_books_session_token_unique
  on public.junior_books (session_token) where session_token is not null;

-- 1 livro "geral" por user (livros amarrados a attempts não contam aqui).
create unique index junior_books_user_general_unique
  on public.junior_books (user_id)
  where user_id is not null and attempt_id is null;
