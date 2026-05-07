# Andaime

Tutor socrático de IA para aprendizagem real. A IA não entrega respostas prontas — trabalha sobre a produção do aluno, faz perguntas orientadoras e devolve a responsabilidade cognitiva ao estudante.

Ver `docs/superpowers/specs/2026-05-06-andaime-design.md` para o design completo e
`docs/superpowers/plans/` para os planos de fase.

## Pré-requisitos
- Node 20+
- pnpm 10+
- Docker (para Supabase local)
- (Opcional) `ANTHROPIC_API_KEY` para chat real com Claude

## Setup

```bash
pnpm install
cp .env.local.example .env.local            # ajuste valores
pnpm exec supabase start                    # sobe Postgres + Auth local
pnpm exec supabase db reset                 # aplica migrações
pnpm exec supabase gen types typescript --local > src/types/database.ts
pnpm dev                                    # http://localhost:3000 (ou 3001 se 3000 ocupado)
```

## Ports (Supabase local)
Para evitar conflito com outras instâncias, este projeto usa **55321-55329**:
- API: `http://127.0.0.1:55321`
- DB: `postgresql://postgres:postgres@127.0.0.1:55322/postgres`
- Studio: `http://127.0.0.1:55323`

## Demo data (já no DB)
Após `db reset`, há contas de teste se você já fez signup pela UI. Para semear manualmente:

```sql
-- Como teacher (mais fácil pela UI: /signup → /teacher/classes/new)
-- Aluno entra com código no /student/join
```

## Fluxo do aluno
1. `/signup` → `/dashboard` (papel default: student)
2. `/student/join` → digita código da turma
3. Abre tarefa em `/student/assignment/<id>`
4. **Tente primeiro** — escreve tentativa inicial (mín. caracteres exigidos)
5. **Diálogo com a IA** — Andaime devolve perguntas, nunca a resposta
6. **Versão final** — entrega consolidada
7. Score de autonomia calculado e exibido

## Fluxo do professor
1. `/signup` → `/teacher/classes/new` (auto-promove para `teacher`)
2. Recebe **código** ANDA-XXXX para os alunos
3. Cria tarefas com enunciado, critérios e regras (max_hints, min_initial_chars)
4. Em `/teacher/classes/<id>` vê alunos e tarefas
5. Em `/teacher/assignments/<id>` vê todas as tentativas
6. Em `/teacher/attempts/<id>` vê a trilha completa de raciocínio do aluno

## Guardrails da IA (núcleo do produto)
- **Pré-classificador** (regex, sem custo de token): bloqueia "me dá a resposta", "responde isso", "não sei nada", etc. → devolve mensagem padronizada pedindo tentativa.
- **System prompt** rígido (`src/lib/ai/system-prompt.ts`): princípios não-negociáveis, estrutura de resposta socrática, comportamento perante pedidos diretos.
- **Pós-validador**: respostas longas demais (>800 chars) ou que começam com "a resposta é..." são substituídas por uma pergunta de recuo.
- **Limite de pistas** por tarefa (configurável pelo professor).
- **Logging integral** em `turns` + `event_log` para auditoria pedagógica.

## Stack
- **Next.js 16** (App Router, TS, Turbopack)
- **Tailwind 4** + **shadcn/ui** (Base UI primitives)
- **Supabase** (Postgres + Auth + RLS)
- **Anthropic SDK** + **Claude Sonnet 4.6** com prompt caching no system prompt

## Testes

```bash
pnpm test          # unit (Vitest) — 17 testes
pnpm tsc --noEmit  # typecheck
pnpm lint
pnpm build         # production build
```

## Estrutura de rotas
```
/                                           landing
/login, /signup, /callback                  auth
/dashboard                                  student OU teacher (depende do role)
/student/join                               entrar em turma
/student/assignment/[id]                    workspace do aluno (gate + chat + final)
/teacher/classes/new                        criar turma
/teacher/classes/[id]                       turma (alunos, tarefas)
/teacher/classes/[id]/assignments/new       criar tarefa
/teacher/assignments/[id]                   tentativas dos alunos numa tarefa
/teacher/attempts/[id]                      trilha completa de uma tentativa

API (POST):
/api/auth/signout
/api/class/create, /api/class/join
/api/assignment/create
/api/attempt/start, /api/attempt/finalize
/api/chat
```

## Status atual

**MVP ponta-a-ponta funcionando:**
- ✅ Auth (email + Google OAuth pronto, basta credencial)
- ✅ Schema (8 tabelas) + RLS multicamada (alunos isolados, professores leem turma)
- ✅ Aluno: dashboard, join por código, gate "tente primeiro", chat socrático, finalização com score
- ✅ Professor: criar turma com código, criar tarefa com regras de andaime, ver tentativas, ver trilha completa
- ✅ Guardrails da IA: pré-classificador + system prompt + pós-validador
- ✅ Score de autonomia (versão simples baseada em pistas e crescimento de texto)
- ✅ 17 testes unitários verdes

**Para usar com Claude real:** adicione `ANTHROPIC_API_KEY` ao `.env.local`.

**Próximas iterações sugeridas:**
- Streaming token-a-token no chat (já há AI SDK instalada)
- Tarefa de transferência sem IA (Phase 7 do spec)
- Comparação visual versão inicial vs final
- Alertas para professor (sinais de cópia, baixa autonomia)
- Multi-tenant por escola
- Deploy production (Vercel + Supabase Cloud)
