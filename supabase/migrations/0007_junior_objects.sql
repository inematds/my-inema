-- Junior objects: a parallel "row" alongside characters. An object is a
-- thing (carro, colar, livro, espada) that the kid can summon and reuse
-- across scenes. Same access pattern as characters/settings — service-role
-- only via Andaime API; RLS off for now.

create table public.junior_objects (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.junior_books(id) on delete cascade,
  description text not null,
  name text,
  epithet text,
  image_data text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index junior_objects_book_idx on public.junior_objects (book_id, position);

create table public.junior_scene_objects (
  scene_id uuid not null references public.junior_scenes(id) on delete cascade,
  object_id uuid not null references public.junior_objects(id) on delete cascade,
  primary key (scene_id, object_id)
);
