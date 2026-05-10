# Andaime

**v1.16.0** — Plataforma pedagógica com IA socrática. A IA nunca entrega a resposta pronta: trabalha sobre a produção do aluno, devolve perguntas orientadoras e mantém a responsabilidade cognitiva com o estudante (princípio do espelho).

Três verticais funcionando ponta-a-ponta dentro de um mesmo classroom:

- **Andaime Junior** — ateliê de livros ilustrados para crianças (~10 anos). Personagens, objetos, cenas e capa via `flux2-klein` (self-hosted). Publicação no mural da turma + mural global.
- **Andaime Math** — tutor socrático de matemática. Aluno tenta, IA faz pergunta de retomada (nunca revela a resposta, mesmo após múltiplos erros).
- **Filmes** — Storybook do Junior renderizado server-side em MP4 1080×1920 via Remotion, com narração TTS via inemavox (engine edge).

## Pré-requisitos

- Node 20+, pnpm 10+
- Docker (Supabase local)
- `ANTHROPIC_API_KEY` (chat socrático + AI suggester + Math)
- Self-hosted opcional: `inemaimg` (`:8000`, geração de imagem flux2-klein) e `inemavox` (`:8010`, TTS+áudio)

## Setup

```bash
pnpm install
cp .env.local.example .env.local            # ajuste valores
pnpm exec supabase start                    # Postgres + Auth local (portas 55321-55329)
pnpm exec supabase db reset                 # aplica todas as migrações 0001–0014
pnpm exec supabase gen types typescript --local > src/types/database.ts
pnpm dev                                    # http://localhost:3000
```

## Portas (Supabase local)

Para evitar conflito com outras instâncias, este projeto usa **55321-55329**:

- API: `http://127.0.0.1:55321`
- DB: `postgresql://postgres:postgres@127.0.0.1:55322/postgres`
- Studio: `http://127.0.0.1:55323`

## Roles e fluxos

Três roles, cada uma com home própria em `/dashboard`:

### Aluno (`student`)
1. `/signup` → cria conta (default: student)
2. `/student/join` → entra na turma com código `ANDA-XXXX`
3. Abre tarefa em `/student/assignment/[id]`
4. **Junior:** cria personagens → objetos → cenas → publica livro no mural da turma
5. **Redação:** "tente primeiro" → diálogo socrático → versão final → score
6. **Math:** envia tentativa → IA devolve pergunta (nunca a resposta)

### Professor (`teacher`)
1. `/signup` → `/teacher/classes/new` (auto-promove para teacher)
2. Cria turma com template role-aware (junior/redação/math) e starter assignment opcional
3. Convida alunos via link copiável + WhatsApp ou bulk-enroll por planilha
4. Painel: `/teacher/assignments/[id]` mostra métricas + tentativas filtráveis + estrela ★ pra destacar no mural
5. `/teacher/junior/[attemptId]` para ver trilha do livro de uma criança
6. AI suggester (`✨ me dá uma ideia`) gera enunciados; PDF download via jspdf

### Pai/Mãe (`parent`)
1. Self-upgrade do role student via `/api/auth/become`
2. Vê tarefas dos filhos no mesmo dashboard

## Mural

- `/mural` — global (todos os livros publicados publicamente)
- `/aulas/[id]/mural` — mural da turma (acesso público com service-role bypass de RLS)
- `/mural/[publicationId]` — leitor com cenas + áudio + render server MP4

## Filmes (Remotion + TTS)

- `<RenderServerButton>` chama `/api/junior/render?storybookId=…&narrate=true`
- Composition: `src/remotion/Storybook.tsx` (1080×1920, ken-burns + fade, 7s/cena)
- Backend: `selectComposition` + `renderMedia` em `src/lib/junior/render-storybook.ts`
- TTS: `src/lib/junior/inemavox-tts.ts` POST `/api/jobs/tts` engine edge → base64 data URL → `<Audio>` por cena
- Config: `next.config.ts` com `serverExternalPackages` para resolver compositor do Remotion sem Turbopack-error

## Math vertical (v1.16.0)

- `<MathWorkspace>` com submissão livre (texto)
- POST `/api/math/answer` chama Claude com prompt do problema (`assignment.prompt`), resposta esperada (`criteria`), histórico de tentativas (`turns`)
- Validação dura: regex bloqueia "a resposta é…" no output da IA; sempre devolve uma pergunta de retomada
- Sem schema novo — reusa `attempts/turns`. Animação Manim render real ainda pendente.

## Guardrails da IA

- **Pré-classificador** (regex, sem token): bloqueia "me dá a resposta", "responde isso", "não sei nada"
- **System prompt** rígido (`src/lib/ai/system-prompt.ts`): princípios não-negociáveis, estrutura socrática
- **Pós-validador**: respostas que começam com "a resposta é…" são substituídas por pergunta de recuo
- **Limite de pistas** por tarefa (configurável)
- **Logging integral** em `turns` + `event_log` para auditoria pedagógica
- **Mirror principle no Math**: mesmo após N erros, IA jamais revela a resposta

## Stack

- **Next.js 16** (App Router, TS, Turbopack) — leia guides em `node_modules/next/dist/docs/` (breaking changes vs versões anteriores)
- **Tailwind 4** + **shadcn/ui** com tokens `parchment` (paper/ink/magic)
- **Supabase** (Postgres + Auth + RLS + realtime publication migr 0014)
- **Anthropic SDK** + **Claude Sonnet 4.6** com prompt caching
- **Remotion** vendored em v1.14+ para render server-side
- **Self-hosted infra** (vizinhos, opcionais): `inemaimg` (flux2-klein), `inemavox` (TTS edge/chatterbox)

## Schema (migrações)

| Mig   | Conteúdo                                                                 |
|-------|--------------------------------------------------------------------------|
| 0001  | Esquema base: users, classes, assignments, attempts, turns, event_log    |
| 0009  | Slice 6: `assignments.lesson_type`, `junior_books.attempt_id`, scope     |
| 0010  | Slice 7: `assignments.featured_attempt_id` (destaque ★)                  |
| 0011  | Role `parent` + trigger `handle_new_user` lê `raw_user_meta_data->role`  |
| 0012  | Feedback do professor (`teacher_feedback`)                               |
| 0013  | Phase D: `attempt_messages` (chat), `notifications`                      |
| 0014  | Realtime publication para chat e notificações                            |

## Estrutura de rotas

```
/                                           landing (3 cards de entrada)
/login, /signup, /callback                  auth
/dashboard                                  home role-aware
/junior                                     mural global
/junior/criar                               workspace (criar livro)
/aulas/[id]/mural                           mural da turma (público)
/mural/[publicationId]                      leitor

/student/join                               entrar em turma por código
/student/assignment/[id]                    workspace do aluno (Junior/Math/Redação)

/teacher/classes/new                        criar turma + template
/teacher/classes/[id]                       turma (alunos, tarefas, convite, bulk)
/teacher/classes/[id]/assignments/new       criar tarefa (com AI suggester)
/teacher/assignments/[id]                   métricas + tentativas (★ destacar)
/teacher/attempts/[id]                      trilha de uma tentativa
/teacher/junior/[attemptId]                 trilha de livro Junior

API (POST/GET/PATCH/DELETE):
/api/auth/{signout,switch,become}
/api/class/{create,join,[id],[id]/bulk-enroll}
/api/assignment/{create,suggest,[id],[id]/feature}
/api/attempt/{start,finalize,[id]/messages}
/api/junior/{ambient,publish,render}
/api/math/answer
/api/mural,  /api/mural/[id]
/api/notifications
/api/chat
```

## Testes

```bash
pnpm test          # unit (Vitest)
pnpm tsc --noEmit  # typecheck
pnpm lint
pnpm build         # production build
```

## Histórico de versões

| Versão  | Tema                                                                  |
|---------|-----------------------------------------------------------------------|
| v1.3.0  | Slice 2 — workspace `/junior`, cookie-anon (deprecated em Slice 6)    |
| v1.4.0  | Slice 3 — cenas via flux2-klein multi-ref + caption ollama qwen2.5    |
| v1.5.0  | Slice 4 — workspace 6 atos + Filme slideshow                          |
| v1.6.0  | Slice 5 — mural + publicação anônima                                  |
| v1.7.0  | Slice 6 — login simplificado, classroom unificado                     |
| v1.8.0  | Slice 6 — mig 0009, dispatcher, resolveBook                           |
| v1.9.0  | Slice 7 — painel pedagógico, métricas, ★ destacar                     |
| v1.9.1  | Role `parent`                                                         |
| v1.10.0 | Templates de turma role-aware                                         |
| v1.11.0 | Galeria de turmas, invite, CRUD, feedback                             |
| v1.12.0 | AI suggester, PDF, bulk-enroll, trocar conta                          |
| v1.13.0 | Phase D — chat, notificações, math placeholder, render cliente .webm  |
| v1.14.0 | Remotion Phase 2 — server-side MP4 1080×1920                          |
| v1.15.0 | Remotion Phase 3 — narração TTS via inemavox edge                     |
| v1.16.0 | Math vertical — tutor socrático funcional                             |

## Princípios não-negociáveis

- **Mirror principle**: IA espelha esforço do aluno, nunca substitui (`memory/product_principle_mirror.md`)
- **Mirror no Math**: nunca revelar a resposta, mesmo após N erros (`memory/mirror_principle_math.md`)
- **Sem dopamina-shortcut**: zero streaks, XP, badges (`memory/design_direction.md`)
- **HARD RULE infra**: nunca trocar modelo do `inemaimg` — só `flux2-klein` (swap trava o servidor 10+ min)

## Próximos passos

- Manim render real (vertical Math ainda sem animação)
- Realtime subscription via `supabase.channel()` (substituir polling em chat e notifs — mig 0014 já ativou publication)
- Galeria compartilhada cross-book
- Moderação automática para conteúdo de menores (LGPD)
- Importação Google Classroom

Mais detalhe em `docs/superpowers/specs/` e na memória do projeto em `~/.claude/projects/-home-nmaldaner-projetos-my-inema/memory/MEMORY.md`.
