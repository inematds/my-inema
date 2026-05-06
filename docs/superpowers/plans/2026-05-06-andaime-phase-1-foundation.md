# Andaime — Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a working Next.js 15 + Supabase project with database schema, RLS, auth (email + Google), base UI shell, and a protected dashboard route — runnable locally and ready for Phase 2 (student flow).

**Architecture:** Next.js App Router (TS) on Vercel; Supabase (Postgres + Auth + RLS) for data and identity; Tailwind + shadcn/ui for UI; Vercel AI SDK reserved for Phase 3. Server Components by default; Client Components for auth forms and interactive UI. Database access through `@supabase/ssr` with cookie-based auth.

**Tech Stack:** Next.js 15.x, React 19, TypeScript 5.x, Tailwind CSS 4.x, shadcn/ui, @supabase/supabase-js, @supabase/ssr, Vitest, Playwright, pnpm.

**Scope note:** This plan covers Phase 1 only (week 1 of the roadmap in the spec). Subsequent phases (student flow, AI integration, teacher panel, reports) get their own plans after Phase 1 ships.

---

## File Structure (after Phase 1)

```
my-inema/
├── docs/
│   ├── superpowers/specs/2026-05-06-andaime-design.md
│   └── superpowers/plans/2026-05-06-andaime-phase-1-foundation.md
├── supabase/
│   └── migrations/
│       ├── 0001_init_schema.sql
│       └── 0002_rls_policies.sql
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (fonts, providers, html)
│   │   ├── page.tsx                # Public landing
│   │   ├── globals.css             # Tailwind base + tokens
│   │   ├── (auth)/
│   │   │   ├── layout.tsx          # Auth layout (centered)
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── callback/route.ts   # Supabase OAuth callback
│   │   └── (app)/
│   │       ├── layout.tsx          # Protected app layout (sidebar)
│   │       └── dashboard/page.tsx  # "Hello, {user.name}" placeholder
│   ├── components/
│   │   ├── ui/                     # shadcn primitives (button, input, etc.)
│   │   ├── auth-form.tsx           # Email login/signup form
│   │   └── app-shell.tsx           # Sidebar + topbar
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # Browser client (Client Components)
│   │   │   ├── server.ts           # Server client (Server Components/Actions)
│   │   │   └── middleware.ts       # Refresh session in middleware
│   │   ├── auth/
│   │   │   └── require-user.ts     # Throw redirect if no session
│   │   └── utils.ts                # cn() helper
│   ├── middleware.ts               # Next.js middleware → calls supabase/middleware.ts
│   └── types/
│       └── database.ts             # Generated Supabase types (placeholder for Phase 1)
├── tests/
│   ├── unit/
│   │   └── lib/utils.test.ts
│   └── e2e/
│       └── smoke.spec.ts           # Landing → login page reachable
├── .env.local.example
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── components.json                 # shadcn config
├── vitest.config.ts
├── playwright.config.ts
├── package.json
└── README.md
```

Each file has a single clear responsibility. Auth UI lives separately from app shell. Supabase clients are split per environment (browser, server, middleware) because cookie handling differs.

---

## Task 1: Initialize Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1.1: Initialize with create-next-app**

```bash
cd /home/nmaldaner/projetos/my-inema
pnpm dlx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --turbopack \
  --no-git \
  --use-pnpm \
  --yes
```

Expected: scaffold created. If `pnpm` is missing, install with `npm i -g pnpm@latest`.

- [ ] **Step 1.2: Verify build runs**

```bash
pnpm dev
```

Expected: server starts on `http://localhost:3000`. Stop with Ctrl+C.

- [ ] **Step 1.3: Replace landing page with minimal placeholder**

Replace `src/app/page.tsx`:

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-background text-foreground">
      <h1 className="text-4xl font-semibold tracking-tight">Andaime</h1>
      <p className="max-w-prose text-center text-muted-foreground">
        IA que ensina, não responde por você. Tutor socrático para aprendizagem real.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Entrar
        </Link>
        <Link
          href="/signup"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Criar conta
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 1.4: Commit**

```bash
git add .
git commit -m "feat: initialize Next.js project"
```

---

## Task 2: Configure shadcn/ui

**Files:**
- Create: `components.json`, `src/lib/utils.ts`, `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/card.tsx`

- [ ] **Step 2.1: Initialize shadcn**

```bash
pnpm dlx shadcn@latest init -y -d
```

When prompted, accept defaults: Default style, Slate base, CSS variables. This creates `components.json` and `src/lib/utils.ts` (with `cn` helper).

- [ ] **Step 2.2: Add baseline components**

```bash
pnpm dlx shadcn@latest add button input label card -y
```

Expected: files created under `src/components/ui/`.

- [ ] **Step 2.3: Smoke check the UI**

Edit `src/app/page.tsx` to import `Button` and replace the two `<Link>` buttons with shadcn `<Button asChild>` wrappers:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-background text-foreground">
      <h1 className="text-4xl font-semibold tracking-tight">Andaime</h1>
      <p className="max-w-prose text-center text-muted-foreground">
        IA que ensina, não responde por você. Tutor socrático para aprendizagem real.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/login">Entrar</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/signup">Criar conta</Link>
        </Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 2.4: Run typecheck**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2.5: Commit**

```bash
git add .
git commit -m "feat: configure shadcn/ui with baseline components"
```

---

## Task 3: Configure Supabase clients

**Files:**
- Create: `.env.local.example`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`, `src/middleware.ts`, `src/types/database.ts`

- [ ] **Step 3.1: Install Supabase packages**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 3.2: Create env example**

Create `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Also copy `cp .env.local.example .env.local` and fill with real values from Supabase dashboard before running auth flows.

- [ ] **Step 3.3: Create types stub**

Create `src/types/database.ts`:

```ts
// Placeholder until we run `supabase gen types typescript` in Task 5.
// After migrations are applied, regenerate this file and replace the body.
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
```

- [ ] **Step 3.4: Browser client**

Create `src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 3.5: Server client**

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies; ignored when called from RSC.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3.6: Middleware client (refresh session)**

Create `src/lib/supabase/middleware.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touch the session so refresh tokens rotate.
  await supabase.auth.getUser();

  return response;
}
```

- [ ] **Step 3.7: Wire Next middleware**

Create `src/middleware.ts`:

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 3.8: Typecheck**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3.9: Commit**

```bash
git add .
git commit -m "feat: add Supabase clients (browser, server, middleware)"
```

---

## Task 4: Database schema migration

**Files:**
- Create: `supabase/migrations/0001_init_schema.sql`

- [ ] **Step 4.1: Install Supabase CLI (if not present)**

```bash
pnpm add -D supabase
```

- [ ] **Step 4.2: Initialize supabase folder**

```bash
pnpm supabase init
```

Accept defaults; this creates `supabase/config.toml`.

- [ ] **Step 4.3: Write schema migration**

Create `supabase/migrations/0001_init_schema.sql`:

```sql
-- Andaime — initial schema (Phase 1)

create extension if not exists "pgcrypto";

-- Roles enum
create type public.user_role as enum ('admin', 'teacher', 'student');

-- Schools
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- App users (mirrors auth.users with profile data)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role public.user_role not null default 'student',
  school_id uuid references public.schools(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Classes (a teacher's group of students)
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid not null references public.users(id) on delete restrict,
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now()
);

-- Enrollments (student ↔ class)
create table public.enrollments (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

-- Assignments (Phase 2 will populate; defined now so RLS exists)
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  prompt text not null,
  criteria text,
  max_hints int not null default 3,
  min_initial_chars int not null default 200,
  created_at timestamptz not null default now()
);

-- Attempts (one per student per assignment)
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'transferred')),
  autonomy_score numeric,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (assignment_id, student_id)
);

-- Turns (every message in the attempt — student or AI)
create table public.turns (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  author text not null check (author in ('student', 'ai', 'system')),
  kind text not null check (kind in ('initial', 'question', 'hint', 'feedback', 'revision', 'final', 'transfer')),
  content text not null,
  tokens_used int,
  created_at timestamptz not null default now()
);

-- Audit log (pedagogical event stream)
create table public.event_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  attempt_id uuid references public.attempts(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Trigger: auto-insert into public.users when auth.users gets a row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Indexes
create index idx_enrollments_student on public.enrollments(student_id);
create index idx_attempts_student on public.attempts(student_id);
create index idx_attempts_assignment on public.attempts(assignment_id);
create index idx_turns_attempt on public.turns(attempt_id, created_at);
create index idx_event_log_attempt on public.event_log(attempt_id, created_at);
```

- [ ] **Step 4.4: Apply migration locally**

```bash
pnpm supabase start
pnpm supabase db reset
```

Expected: local Supabase boots in Docker; schema applied. If Docker is not running, start it first.

- [ ] **Step 4.5: Write a smoke SQL test**

Create `supabase/tests/0001_schema.sql`:

```sql
begin;
select plan(3);

select has_table('public', 'users', 'users table exists');
select has_table('public', 'classes', 'classes table exists');
select has_table('public', 'turns', 'turns table exists');

select * from finish();
rollback;
```

Run:

```bash
pnpm supabase test db
```

Expected: all 3 assertions pass.

- [ ] **Step 4.6: Commit**

```bash
git add .
git commit -m "feat: initial database schema (schools, users, classes, attempts, turns)"
```

---

## Task 5: RLS policies

**Files:**
- Create: `supabase/migrations/0002_rls_policies.sql`

- [ ] **Step 5.1: Write RLS migration**

Create `supabase/migrations/0002_rls_policies.sql`:

```sql
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
```

- [ ] **Step 5.2: Apply and verify**

```bash
pnpm supabase db reset
```

Expected: both migrations apply cleanly.

- [ ] **Step 5.3: Write RLS smoke test**

Create `supabase/tests/0002_rls.sql`:

```sql
begin;
select plan(2);

-- Verify RLS is on for sensitive tables
select is(
  (select relrowsecurity from pg_class where relname = 'attempts'),
  true,
  'attempts has RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where relname = 'turns'),
  true,
  'turns has RLS enabled'
);

select * from finish();
rollback;
```

```bash
pnpm supabase test db
```

Expected: 5 assertions pass total (3 from Task 4, 2 from this task).

- [ ] **Step 5.4: Generate TypeScript types**

```bash
pnpm supabase gen types typescript --local > src/types/database.ts
```

Expected: `src/types/database.ts` is overwritten with the real generated types.

- [ ] **Step 5.5: Typecheck**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5.6: Commit**

```bash
git add .
git commit -m "feat: RLS policies + generated database types"
```

---

## Task 6: Auth pages and require-user helper

**Files:**
- Create: `src/lib/auth/require-user.ts`, `src/components/auth-form.tsx`, `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/callback/route.ts`

- [ ] **Step 6.1: require-user helper**

Create `src/lib/auth/require-user.ts`:

```ts
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}
```

- [ ] **Step 6.2: Auth form (Client Component)**

Create `src/components/auth-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/callback` },
    });
    if (error) setError(error.message);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      {mode === "signup" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
      </Button>
      <Button type="button" variant="outline" onClick={handleGoogle}>
        Continuar com Google
      </Button>
    </form>
  );
}
```

- [ ] **Step 6.3: Auth layout**

Create `src/app/(auth)/layout.tsx`:

```tsx
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <Link href="/" className="mb-8 text-2xl font-semibold tracking-tight">
        Andaime
      </Link>
      {children}
    </div>
  );
}
```

- [ ] **Step 6.4: Login page**

Create `src/app/(auth)/login/page.tsx`:

```tsx
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      <h1 className="text-2xl font-medium">Entrar</h1>
      <AuthForm mode="login" />
      <p className="text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link href="/signup" className="underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 6.5: Signup page**

Create `src/app/(auth)/signup/page.tsx`:

```tsx
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      <h1 className="text-2xl font-medium">Criar conta</h1>
      <AuthForm mode="signup" />
      <p className="text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 6.6: OAuth callback route**

Create `src/app/(auth)/callback/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
```

- [ ] **Step 6.7: Typecheck**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6.8: Commit**

```bash
git add .
git commit -m "feat: auth pages (login, signup, callback) and require-user helper"
```

---

## Task 7: App shell and protected dashboard

**Files:**
- Create: `src/components/app-shell.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 7.1: App shell**

Create `src/components/app-shell.tsx`:

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("name, role")
    .eq("id", user!.id)
    .single();

  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr] bg-background text-foreground">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          Andaime
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {profile?.name} · {profile?.role}
          </span>
          <form action="/api/auth/signout" method="post">
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 7.2: Sign-out route**

Create `src/app/api/auth/signout/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
```

- [ ] **Step 7.3: Protected app layout**

Create `src/app/(app)/layout.tsx`:

```tsx
import { requireUser } from "@/lib/auth/require-user";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return <AppShell>{children}</AppShell>;
}
```

- [ ] **Step 7.4: Dashboard placeholder**

Create `src/app/(app)/dashboard/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-3 max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">Bem-vindo</h1>
      <p className="text-muted-foreground">
        Você está autenticado como <strong>{user?.email}</strong>. Em breve, suas
        turmas e tarefas vão aparecer aqui.
      </p>
    </div>
  );
}
```

- [ ] **Step 7.5: Manual smoke**

```bash
pnpm dev
```

In a browser:
1. Visit `http://localhost:3000` — landing renders.
2. Click **Criar conta**, fill form, submit — should redirect to `/dashboard`.
3. Click **Sair** — should return to `/`.
4. Visit `http://localhost:3000/dashboard` while logged out — should redirect to `/login`.

If any step fails, fix before committing.

- [ ] **Step 7.6: Commit**

```bash
git add .
git commit -m "feat: protected app shell and dashboard placeholder"
```

---

## Task 8: Tests and CI baseline

**Files:**
- Create: `vitest.config.ts`, `tests/unit/lib/utils.test.ts`, `playwright.config.ts`, `tests/e2e/smoke.spec.ts`, `.github/workflows/ci.yml`

- [ ] **Step 8.1: Install Vitest**

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 8.2: Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/unit/**/*.test.{ts,tsx}"],
  },
});
```

- [ ] **Step 8.3: First unit test**

Create `tests/unit/lib/utils.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("dedupes conflicting tailwind classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("ignores falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
```

- [ ] **Step 8.4: Run unit tests**

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Run:

```bash
pnpm test
```

Expected: 3 passing tests.

- [ ] **Step 8.5: Install Playwright**

```bash
pnpm add -D @playwright/test
pnpm dlx playwright install chromium
```

- [ ] **Step 8.6: Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 8.7: Smoke e2e**

Create `tests/e2e/smoke.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("landing → login → signup pages render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Andaime" })).toBeVisible();

  await page.getByRole("link", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();

  await page.getByRole("link", { name: "Criar conta" }).click();
  await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible();
});

test("protected route redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});
```

Add to `package.json` scripts:

```json
"test:e2e": "playwright test"
```

Run:

```bash
pnpm test:e2e
```

Expected: 2 passing tests. Local Supabase must be running for the redirect test to succeed.

- [ ] **Step 8.8: README**

Create `README.md`:

```markdown
# Andaime

Tutor socrático de IA para aprendizagem real. Ver `docs/superpowers/specs/` para o design.

## Pré-requisitos
- Node 20+, pnpm 9+
- Docker (para Supabase local)

## Setup
\`\`\`bash
pnpm install
cp .env.local.example .env.local   # preencher com credenciais Supabase
pnpm supabase start                # sobe Postgres + Auth local
pnpm supabase db reset             # aplica migrações
pnpm supabase gen types typescript --local > src/types/database.ts
pnpm dev
\`\`\`

## Testes
\`\`\`bash
pnpm test          # unit
pnpm test:e2e      # end-to-end
pnpm supabase test db   # SQL/RLS
\`\`\`
```

- [ ] **Step 8.9: Commit**

```bash
git add .
git commit -m "test: vitest unit + playwright smoke + README"
```

---

## Task 9: Final integration check

- [ ] **Step 9.1: Full typecheck**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9.2: Lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 9.3: Build**

```bash
pnpm build
```

Expected: production build succeeds.

- [ ] **Step 9.4: Run all tests**

```bash
pnpm test && pnpm test:e2e && pnpm supabase test db
```

Expected: all green.

- [ ] **Step 9.5: Tag the milestone**

```bash
git tag -a v0.1.0-foundation -m "Phase 1 foundation complete"
```

---

## Acceptance criteria (Phase 1 complete)

- `pnpm dev` serves a working app on `localhost:3000`.
- A new user can sign up via email, lands on `/dashboard`.
- Logged-out user hitting `/dashboard` is redirected to `/login`.
- Database has tables: `schools`, `users`, `classes`, `enrollments`, `assignments`, `attempts`, `turns`, `event_log`.
- RLS is enabled on all tables; an authenticated user can only see their own profile via the `users` table.
- All unit, e2e, and SQL tests pass.
- TypeScript compiles with no errors.
- Production build (`pnpm build`) succeeds.

## Out of scope (Phase 2+)

- Assignment creation UI (Phase 5).
- Student attempt flow (Phase 2).
- Claude integration / streaming (Phase 3).
- Teacher dashboard (Phase 6).
- Score-of-autonomy calculation (Phase 4).
