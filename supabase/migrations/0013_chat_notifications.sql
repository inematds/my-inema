-- D3 — chat aluno↔professor (uma thread por attempt) + D4 — notificações.

create table public.attempt_messages (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index attempt_messages_attempt_idx
  on public.attempt_messages (attempt_id, created_at);

-- Notifications: simple per-user inbox. payload é JSON livre por kind.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in (
    'book_published',     -- aluno publicou; vai pro professor
    'book_feedback',      -- professor comentou; vai pro aluno
    'new_assignment',     -- professor criou aula; vai pra todos enrolled
    'message_received',   -- nova msg no chat; vai pra contraparte
    'attempt_featured'    -- professor destacou; vai pro aluno
  )),
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create index notifications_user_all_idx
  on public.notifications (user_id, created_at desc);
