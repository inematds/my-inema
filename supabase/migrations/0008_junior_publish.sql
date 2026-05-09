-- Add lesson_type discriminator (so future verticals — math, history etc. —
-- can coexist on the same mural) and publication metadata to junior_books.
-- A book is "on the mural" iff published_at is not null.

alter table public.junior_books
  add column lesson_type text not null default 'junior_books',
  add column published_at timestamptz,
  add column published_title text;

create index junior_books_published_idx
  on public.junior_books (published_at desc nulls last)
  where published_at is not null;
