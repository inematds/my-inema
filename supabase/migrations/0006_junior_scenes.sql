-- Junior scenes: each scene combines one setting and 1+ characters with a
-- description of what happens. Same access pattern as characters/settings —
-- accessed only through Andaime API routes via service role; RLS off for now.

create table public.junior_scenes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.junior_books(id) on delete cascade,
  setting_id uuid references public.junior_settings(id) on delete set null,
  description text not null,
  name text,
  epithet text,
  image_data text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index junior_scenes_book_idx on public.junior_scenes (book_id, position);

create table public.junior_scene_characters (
  scene_id uuid not null references public.junior_scenes(id) on delete cascade,
  character_id uuid not null references public.junior_characters(id) on delete cascade,
  primary key (scene_id, character_id)
);
