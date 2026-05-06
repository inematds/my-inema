# Andaime — Design Spec (MVP + Painel do Professor)

**Data:** 2026-05-06
**Autor:** Nei Maldaner
**Status:** aprovado para implementação (decisões delegadas ao agente)

---

## 1. Visão

**Andaime** é uma plataforma web de IA educacional que funciona como **tutor socrático** e **andaime pedagógico**. A IA não entrega respostas prontas: ela trabalha sobre a produção inicial do aluno, faz perguntas orientadoras, identifica lacunas e devolve a responsabilidade cognitiva ao estudante. O objetivo é evitar a "ilusão de competência" causada por chatbots comuns e transformar a IA em ferramenta de pensamento, não de cópia.

## 2. Problema

Estudos recentes mostram que o uso direto de chatbots melhora o desempenho imediato dos alunos, mas prejudica a aprendizagem real quando os estudantes apenas copiam respostas. Há um paradoxo: produto final melhor, processo cognitivo pior.

## 3. Público-alvo (piloto)

- **Aluno:** Ensino Médio, disciplina de Redação.
- **Professor:** docente de Redação que cria tarefas, acompanha progresso e relatórios.
- **Instituição:** escola privada ou pública com 1-3 turmas no piloto.

Após validação, expansão para outras disciplinas (História, Filosofia, Biologia) e outros níveis (Fundamental II, Superior).

## 4. Princípios pedagógicos (não-negociáveis)

1. A IA nunca entrega resposta completa de imediato.
2. A IA sempre pede tentativa inicial antes de qualquer ajuda.
3. A IA opera **sobre** a produção do aluno, não no lugar dela.
4. A IA faz perguntas orientadoras, não apenas explica.
5. A IA identifica lacunas, contradições e erros — sem corrigir tudo automaticamente.
6. A IA estimula metacognição ("Como você chegou a essa conclusão?").
7. A IA adapta o nível de ajuda à dificuldade do aluno.
8. O sistema registra o **processo**, não só o resultado.
9. Professor acompanha o desenvolvimento do raciocínio.
10. Sistema incentiva autonomia progressiva (menos ajuda da IA ao longo do tempo).

## 5. Decisões técnicas

| Camada | Escolha | Justificativa |
|---|---|---|
| Front + API | **Next.js 15 (App Router, TypeScript)** | SSR, streaming de tokens, API routes integradas |
| UI | **Tailwind CSS + shadcn/ui** | Acelera dev, componentes acessíveis, customizável |
| Streaming IA | **Vercel AI SDK** | Streaming pronto, integração nativa com Claude |
| BD + Auth | **Supabase (Postgres + Auth + RLS)** | RLS isola turmas; auth pronta (email + Google) |
| Storage | **Supabase Storage** | Anexos de tarefas, materiais |
| LLM | **Claude Sonnet 4.6** com prompt caching | Melhor relação custo/qualidade para tutoria; cache reduz custo do system prompt longo |
| Deploy | **Vercel** (front+API) + **Supabase Cloud** | Free tier viável no piloto |
| Observabilidade | **Vercel Analytics** + logs estruturados em tabela `event_log` | Auditoria pedagógica + métricas de produto |
| Idioma | **pt-BR** | Mercado-alvo |
| Testes | **Vitest** (unit) + **Playwright** (e2e dos fluxos críticos) | Padrão do ecossistema Next.js |

## 6. Modelo de domínio

```
School (1) ─< Class (N) ─< Enrollment >─ User
                                          │
                                          └─ role: teacher | student | admin

Class (1) ─< Assignment (N) ─< Attempt (1 por aluno) ─< Turn (N)
                                  │                       │
                                  ├ initial_response       ├ author: student | ai
                                  ├ revisions[]            ├ kind: tentativa | pergunta | pista | feedback | revisão
                                  ├ final_response         └ content
                                  ├ transfer_task_response
                                  └ autonomy_score
```

**Tabelas principais:**
- `schools (id, name, created_at)`
- `users (id, email, name, role, school_id, created_at)` — `role ∈ {admin, teacher, student}`
- `classes (id, school_id, teacher_id, name, code, created_at)`
- `enrollments (class_id, student_id, created_at)`
- `assignments (id, class_id, title, prompt, criteria, max_hints, min_initial_chars, created_at)`
- `attempts (id, assignment_id, student_id, status, autonomy_score, started_at, finished_at)`
- `turns (id, attempt_id, author, kind, content, created_at, tokens_used)`
- `event_log (id, user_id, attempt_id, event_type, payload, created_at)` — auditoria

**RLS (Row-Level Security):**
- Aluno enxerga apenas seus próprios `attempts` e `turns`, e `assignments` das turmas em que está matriculado.
- Professor enxerga `attempts` e `turns` dos alunos das suas turmas.
- Admin (futuro) enxerga tudo da sua `school`.

## 7. Fluxos centrais

### 7.1. Aluno

1. **Login** (Supabase Auth: email + Google).
2. **Dashboard** mostra turmas e tarefas pendentes.
3. **Abrir tarefa** → tela bloqueia interação com IA até o aluno escrever uma tentativa inicial (mínimo de N caracteres, configurável pelo professor).
4. **Submeter tentativa inicial** → IA analisa e responde com perguntas socráticas / pistas graduais (streaming).
5. **Revisar** → aluno reescreve. IA compara versões e mostra "o que evoluiu / o que ainda falta".
6. **Final** → aluno submete versão final.
7. **Tarefa de transferência** (sem IA) → aluno responde uma variação do problema sem acesso ao chatbot, para validar aprendizagem real.
8. **Relatório pessoal** → aluno vê seu próprio score de autonomia, evolução, pontos fortes/fracos.

### 7.2. Professor

1. **Login**.
2. **Criar turma** → recebe código de convite para alunos.
3. **Criar tarefa**: enunciado, critérios de avaliação, regras de andaime (nº máximo de pistas, exigir justificativa, mínimo de caracteres na tentativa inicial).
4. **Dashboard da turma**: progresso por aluno, status das tarefas, alertas.
5. **Detalhe do aluno**: trilha completa de revisões, score de autonomia, pontos a trabalhar.
6. **Alertas automáticos**: aluno com sinais de "cópia de resposta pronta" (heurística textual + comportamento).
7. **Relatórios exportáveis** (CSV/PDF) ao final do bimestre.

## 8. Guardrails da IA (núcleo do produto)

### 8.1. System prompt blindado
Prompt extenso (cacheado) com:
- Princípios pedagógicos não-negociáveis.
- Regras de comportamento (nunca dar resposta direta, sempre devolver pergunta).
- Exemplos few-shot de boas e más respostas.
- Diretriz de adaptação ao nível do aluno.

### 8.2. Classificador de intenção (pré-geração)
Antes de chamar o modelo principal, um classificador rápido (Claude Haiku 4.5 ou regex+heurística) detecta padrões como:
- "me dá a resposta"
- "qual é a resposta correta"
- "responde isso pra mim"

→ Resposta padronizada pedindo tentativa inicial, sem custo da geração principal.

### 8.3. Validador pós-geração
Segundo prompt (Haiku) avalia se a resposta da IA contém solução completa pronta para copiar. Se sim, regenera com instrução reforçada. Limite: 2 tentativas, depois fallback para "Posso te ajudar a chegar lá. Compartilhe o que você já pensou."

### 8.4. Limite de pistas
Por tarefa, professor define `max_hints`. Após esgotar, aluno pode submeter como está (com nota de autonomia) ou pedir extensão ao professor.

### 8.5. Logging integral
Todas as interações ficam em `turns` + `event_log`. Auditoria pedagógica, não vigilância — o aluno sabe que está sendo registrado e o professor só vê dados pedagogicamente úteis.

## 9. Cálculo do score de autonomia

```
autonomy_score = w1 * (1 - hints_used / max_hints)
               + w2 * (delta_quality_initial_to_final)
               + w3 * (transfer_task_score)
               - w4 * (copy_paste_signals)
```

`delta_quality` avaliado por rubrica simples (LLM julga em escala 0-10) comparando inicial vs final.
Pesos default: w1=0.3, w2=0.3, w3=0.3, w4=0.1. Configurável pelo professor.

## 10. Roadmap (8-10 semanas)

| Sem | Entrega |
|---|---|
| 1 | Setup completo (Next.js, Supabase, schema, auth, RLS, layout base, design system) |
| 2 | Fluxo aluno: login → dashboard → tarefa → tentativa inicial bloqueante |
| 3 | Integração Claude (system prompt, streaming, classificador de intenção, validador) |
| 4 | Revisões, comparação inicial→final, score de autonomia v1 |
| 5 | Painel professor: criar turma, criar tarefa, convidar alunos por código |
| 6 | Dashboard professor: progresso por aluno, detalhe de raciocínio, alertas |
| 7 | Tarefa de transferência sem IA + relatório de aprendizagem (aluno e professor) |
| 8 | Polimento, onboarding, landing page, deploy produção, smoke test |
| 9-10 | Piloto com 1 turma real (30 alunos), instrumentação, ajustes |

## 11. Custos estimados (piloto, 1 turma, 30 alunos)

- Vercel Hobby: $0
- Supabase Free: $0 (até esgotar limites; depois Pro $25/mês)
- Anthropic API (Claude Sonnet 4.6 c/ prompt caching): ~$30-80/mês
- Domínio: ~$15/ano
- **Total mensal: < $50** durante o piloto.

Em escala (1.000 alunos ativos): ~$300-500/mês de IA + $25 Supabase Pro + Vercel Pro $20.

## 12. Métricas de sucesso

| Métrica | Alvo |
|---|---|
| % de tarefas com tentativa inicial antes da IA | > 95% |
| Delta médio de qualidade (inicial → final) | > 2 pontos em rubrica 0-10 |
| Score de autonomia em alta ao longo do bimestre | tendência positiva em > 70% dos alunos |
| Performance na tarefa de transferência (sem IA) | > 70% atingem critério mínimo |
| NPS de professores | > 40 |
| Custo por aluno/mês | < R$ 5 |

## 13. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Aluno burla guardrails pedindo resposta de outras formas | Validador pós-geração + log de tentativas suspeitas |
| Custo de LLM explode em escala | Prompt caching agressivo + Haiku para classificador/validador |
| Professor acha trabalhoso configurar | Templates prontos de tarefa por disciplina |
| Aluno não engaja por achar "chato" | Gamificação leve do score de autonomia + feedback positivo da IA |
| Privacidade/LGPD | RLS estrita, dados pedagógicos só ao professor da turma, opt-in claro |
| IA dá resposta pronta apesar dos guardrails | Validador + revisão amostral pelo professor |

## 14. Fora de escopo (MVP)

- Multi-tenant por escola com isolamento de schema (uma escola por enquanto, separação por `school_id`).
- App mobile nativo (web responsivo basta).
- Integrações com LMS (Google Classroom, Moodle) — fase 2.
- Geração automática de tarefas pela IA — fase 2.
- Análise por voz / áudio — fase 3.
- Pagamentos / billing automatizado — venda B2B manual no piloto.

## 15. Próximos passos

1. Gerar plano de implementação detalhado (writing-plans).
2. Scaffold do projeto Next.js + Supabase.
3. Implementar Fase 1 do roadmap (setup + base).
4. Iterar fases seguintes com checkpoints de validação.

---

**Aprovação:** delegada ao agente pelo usuário ("decida tudo... avaliaremos um por um... faça a implementação").
