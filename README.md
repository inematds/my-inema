# Andaime

Tutor socrático de IA para aprendizagem real. A IA não entrega respostas prontas — trabalha sobre a produção do aluno, faz perguntas orientadoras e devolve a responsabilidade cognitiva ao estudante.

Ver `docs/superpowers/specs/2026-05-06-andaime-design.md` para o design completo.

## Pré-requisitos
- Node 20+
- pnpm 10+
- Docker (para Supabase local)

## Setup

```bash
pnpm install
cp .env.local.example .env.local            # já preenchido p/ local
pnpm exec supabase start                    # sobe Postgres + Auth local
pnpm exec supabase db reset                 # aplica migrações
pnpm exec supabase gen types typescript --local > src/types/database.ts
pnpm dev                                    # http://localhost:3000 (ou 3001)
```

## Ports (Supabase local)

Para evitar conflito com outras instâncias, este projeto usa **55321-55329**:
- API: `http://127.0.0.1:55321`
- DB: `postgresql://postgres:postgres@127.0.0.1:55322/postgres`
- Studio: `http://127.0.0.1:55323`

## Testes

```bash
pnpm test          # unit (Vitest)
pnpm test:e2e      # e2e (Playwright) — adicionar em Phase 2
```

## Stack

- **Next.js 16** (App Router, TS, Turbopack)
- **Tailwind 4** + **shadcn/ui** (Base UI primitives)
- **Supabase** (Postgres + Auth + RLS)
- **Vercel AI SDK** + **Claude Sonnet 4.6** (Phase 3)

## Status

**Phase 1 (Foundation) — completa:**
- Schema: schools, users, classes, enrollments, assignments, attempts, turns, event_log
- RLS: alunos isolados, professores leem turma
- Auth (email + Google OAuth) + trigger `auth.users → public.users` automático
- Layout protegido, dashboard placeholder

**Próximas fases (vide spec):**
- Phase 2: fluxo aluno (tarefa → tentativa inicial bloqueante)
- Phase 3: integração Claude com guardrails socráticos
- Phase 4: revisões, score de autonomia
- Phases 5-8: painel professor, transferência sem IA, polimento, piloto
