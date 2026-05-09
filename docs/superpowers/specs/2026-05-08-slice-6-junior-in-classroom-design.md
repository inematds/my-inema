# Slice 6 — Junior dentro do classroom

**Data:** 2026-05-08
**Versão alvo:** v1.7.0
**Estado:** approved, pronto pra executar

## Contexto

A Andaime tem dois sistemas que viviam em paralelo até v1.6.0:

1. **Classroom** (Phase 1, migrações 0001/0002): tabelas `users`, `schools`, `classes`, `enrollments`, `assignments`, `attempts`, `turns`, `event_log`, RLS completa, páginas `/dashboard`, `/teacher/...`, `/student/...`. Pensado pro vertical original — **redação dissertativa com chat tutorial**.

2. **Junior** (Slices 1–5, migrações 0005/0006/0007/0008): livro anônimo via cookie, workspace 5 atos (Personagens → Objetos → Cenários → Cenas → Filme), publicação no mural global. Anônimo, isolado do classroom.

A pedra de toque dessa fatia é **unificar** os dois sob o classroom existente, sem reescrever. Junior vira um *tipo de aula* que professores podem atribuir a turmas; o livro do aluno fica amarrado a uma `attempt`; mural fica scoped por aula.

## Princípios que regem o design

- **Não reinventar o classroom.** Tudo que já existe (turmas, enrollments, RLS) é fonte da verdade.
- **`lesson_type` como discriminator** em `assignments`. Hoje todas as assignments são implicitamente "essay"; o novo campo permite Junior, e abre porta pros próximos verticais (manim/math, etc.) sem nova tabela por tipo.
- **Anônimo continua vivendo.** `/junior` solto via cookie permanece — útil pra dev, demo, kids sem conta. Apenas o caminho autenticado-em-aula é novo.
- **Mirror principle aplicado:** professor vê o trabalho do aluno (publicado ou não) porque o ato de criar é parte do aprendizado. Mural global compartilhado é só quando aluno publica explicitamente.
- **Sem nova autenticação.** Slice 6 usa o `auth.users` que já existe, RLS via `auth.uid()`.

## Decisões cravadas

| Decisão | Escolhido | Por quê |
|---|---|---|
| Discriminator de tipo de aula | `assignments.lesson_type text` | Simples, retrocompatível, escalável pros próximos verticais |
| Modelo de Junior anônimo | Mantido em paralelo (cookie) | Dev/demo, sem regressão |
| Vínculo book ↔ attempt | `junior_books.attempt_id` UNIQUE FK | 1 attempt = 1 book |
| Visibilidade do professor | Vê todas attempts da aula, publicadas ou não | Acompanhamento pedagógico |
| Mural per-assignment | Sim — `/aulas/[id]/mural` | Cada aula é um contexto fechado |
| Mural global anônimo | Mantido em `/mural` | Demo/onboarding |
| Briefing do assignment Junior | Opcional, usa `assignments.prompt` | Reuso do schema existente |

## Schema (migração 0009)

```sql
-- Discriminator de tipo de aula. Existing assignments default 'essay'.
alter table public.assignments
  add column lesson_type text not null default 'essay';

create index assignments_lesson_type_idx on public.assignments (lesson_type);

-- Vínculo livro Junior ↔ attempt. Nullable: anônimos via cookie continuam funcionando.
alter table public.junior_books
  add column attempt_id uuid references public.attempts(id) on delete cascade;

create unique index junior_books_attempt_unique
  on public.junior_books (attempt_id)
  where attempt_id is not null;
```

RLS: as Junior tables continuam OFF (acessadas via service-role pelas API routes). Autorização acontece na camada de aplicação ao validar `attempt → student_id == auth.uid()`.

## Backend

### Lib

**`src/lib/junior/book.ts`** ganha:

```ts
// Existing: getOrCreateBook (cookie), getBookOrNull (cookie)

export async function getOrCreateBookForAttempt(attemptId: string): Promise<JuniorBook> {
  // Validates: caller is the student of the attempt.
  // Looks up junior_books by attempt_id; creates if missing.
  // Throws if attempt belongs to another user, or if attempt's
  // assignment.lesson_type !== 'junior_books'.
}

// Resolves which book applies to the current request:
// - if header x-attempt-id present and user authenticated → attempt-bound
// - else fall back to cookie (anonymous)
export async function resolveBook(req: Request): Promise<JuniorBook>;
```

### API routes

Todas as rotas `/api/junior/*` que hoje usam `getOrCreateBook()` ou `getBookOrNull()` passam por `resolveBook(req)`. Single change point — não duplica rotas.

**`POST /api/assignment/create`** ganha campo `lessonType` (zod enum `["essay", "junior_books"]`, default `"essay"`). Quando `junior_books`, os campos `criteria`, `maxHints`, `minInitialChars` viram opcionais.

**`POST /api/attempt/start`** quando `assignment.lesson_type === 'junior_books'`:
- Pula validação de `min_initial_chars`
- Aceita `initial` vazio (ou ausente) — o "início" do trabalho Junior é o primeiro personagem criado
- Cria a junior_book ligada via `getOrCreateBookForAttempt(attempt.id)`

**`GET /api/mural?assignmentId=<uuid>`**: filtra publicações cujo `attempt.assignment_id === <uuid>`. Sem param: comportamento atual (todas publicadas, anônimo + autenticado).

### RLS reuse

Não cria nova policy. RLS existente cobre:
- assignment teacher-all + student-read-via-enrollment
- attempt student-own + teacher-of-class
- enrollment teacher-all + student-self

Junior tables continuam service-role-only; validação de attempt acontece em `getOrCreateBookForAttempt`.

## Frontend

### Páginas que mudam

**`/dashboard`** (já existe — `(app)/dashboard/page.tsx`):
- Lista turmas do user (filtro por role: aluno vê enrolled; professor vê próprias)
- Card "trabalhos publicados" — últimas 6 publicações do mural global ou da turma
- Continua sendo o "menu pós-login"

**`/student/assignment/[id]`** (já existe):
- Vira dispatcher. Lê `assignment.lesson_type`:
  - `'essay'` → renderiza chat tutorial atual
  - `'junior_books'` → renderiza `<Workspace attemptId={...}>` (componente atual com nova prop)

**`/teacher/classes/[id]/assignments/new`** (já existe):
- Adiciona picker "tipo de aula" no topo
- Tipo essay → formulário atual
- Tipo junior_books → formulário enxuto: título obrigatório, briefing opcional

**`/teacher/assignments/[id]`** (já existe):
- Lista de attempts continua. Para attempts Junior, link "ver livro" abre `/teacher/junior/[attemptId]` em modo read-only

### Páginas/componentes novos

- **`/aulas/[id]/mural`** (rota nova, `(junior)` layout) — mural scoped via `?assignmentId=...`. Reusa `<MuralGrid>` + filtro
- **`/teacher/junior/[attemptId]`** — leitura do livro do aluno em modo read-only (PanelFilm com readOnly + listagem dos personagens/objetos/cenários)
- **`<Workspace attemptId?: string>`** — prop opcional. Quando set, todas chamadas API mandam header `x-attempt-id`. Sem set, comportamento atual (cookie)
- **`<JuniorAssignmentForm>`** — formulário enxuto (título + briefing) usado em `/teacher/classes/[id]/assignments/new` quando picker = junior_books

### Layout / breadcrumb

Header do `(junior)` layout ganha breadcrumb condicional:
- modo attempt: "← {nome da turma} / {título da aula}" linkando pro mural da aula
- modo cookie: continua como está

## Tarefas (ordem de execução)

1. Migração 0009 + types/database.ts atualizado
2. `getOrCreateBookForAttempt` + `resolveBook` em `lib/junior/book.ts`
3. Refatorar `/api/junior/*` rotas pra usar `resolveBook`
4. `/api/assignment/create` ganha `lessonType`
5. `/api/attempt/start` lida com `lesson_type='junior_books'`
6. `/api/mural` aceita `assignmentId` query param
7. `<Workspace attemptId>` prop + propagação de `x-attempt-id`
8. `<JuniorAssignmentForm>` + picker em `/teacher/classes/[id]/assignments/new`
9. Dispatcher em `/student/assignment/[id]`
10. `/aulas/[id]/mural` (novo)
11. `/teacher/junior/[attemptId]` read-only (novo)
12. Breadcrumb condicional no `(junior)` layout
13. `/dashboard` ganha trabalhos publicados
14. Smoke test E2E: cria turma → cria assignment Junior → aluno joina → faz book → publica → professor abre

## Critérios de sucesso

- Aluno autenticado consegue: login → dashboard → escolhe turma → escolhe aula → faz Junior book amarrado à attempt → publica
- Professor consegue: login → dashboard → criar turma → criar assignment tipo Junior → ver attempts dos alunos → abrir o livro de cada aluno (publicado ou não)
- Mural per-assignment lista só publicações daquela aula; mural público anônimo continua funcionando
- Caminho anônimo `/junior` continua funcional sem regressão
- Type-check limpo, dev em :3020 serve as rotas novas

## Não-objetivos (não mexer agora)

- Aprovação/destaque de trabalhos pelo professor — Slice 8
- Métricas/dashboard pedagógico — Slice 8
- Importar turma de Google Classroom/CSV — sempre fora do MVP
- Mudar o vertical de essay (chat tutorial) — coexiste como está

## Aberto / Riscos

- O modal de "publicar no mural" hoje é genérico. Quando attempt mode, ele também precisa marcar `attempts.status = 'submitted'` pra fechar a entrega. Tarefa adicional na #6 ou #7.
- O `(auth)/layout.tsx` é shadcn/styled diferente do `(junior)/layout.tsx` — quando aluno autenticar e ir pro Junior, vai sentir uma quebra estética. Aceitável em MVP, mas anotar como item de polimento futuro.

## Próxima fatia

**Slice 7 — Painel do professor pedagógico** (Slice 8 originalmente)
- Lista trabalhos por aula com filtros de status (in_progress / submitted)
- Aprovar/destacar publicações
- Métricas básicas (% que publicou, tempo médio de criação)
