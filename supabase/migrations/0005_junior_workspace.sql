-- Junior workspace tables for the kids' creative-writing flow.
-- Identity is anonymous via a cookie session_token; api routes hit these
-- with the service role, so RLS stays disabled for slice 2. When kids opt
-- into a real account later, we'll add policies and link user_id.

create table public.junior_books (
  id uuid primary key default gen_random_uuid(),
  session_token text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index junior_books_session_token_idx on public.junior_books (session_token);

create table public.junior_characters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.junior_books(id) on delete cascade,
  description text not null,
  name text,
  epithet text,
  image_data text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index junior_characters_book_idx on public.junior_characters (book_id, position);

create table public.junior_settings (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.junior_books(id) on delete cascade,
  description text not null,
  name text,
  epithet text,
  image_data text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index junior_settings_book_idx on public.junior_settings (book_id, position);

-- updated_at touch trigger for junior_books
create or replace function public.touch_junior_book_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger junior_books_touch_updated_at
  before update on public.junior_books
  for each row execute function public.touch_junior_book_updated_at();
