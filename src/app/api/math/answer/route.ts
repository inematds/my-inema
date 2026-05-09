import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, ANDAIME_MODEL } from "@/lib/ai/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  attemptId: z.guid(),
  // Final answer (number, expression, etc.)
  answer: z.string().min(1).max(500),
  // Step-by-step reasoning the student wrote down.
  workShown: z.string().min(20).max(8000),
});

// Math attempt submission. Stores answer + work_shown in turns, asks Claude
// for socratic feedback (no spoilers — guides without giving the answer),
// returns feedback + a correctness hint based on string-equality with the
// expected answer in assignments.criteria.
//
// Mirror principle: AI never solves for the kid. It nudges and asks back.
export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: attempt } = await supabase
    .from("attempts")
    .select(
      "id, student_id, status, assignments!inner(id, lesson_type, prompt, criteria)",
    )
    .eq("id", parsed.data.attemptId)
    .single();
  if (!attempt) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (attempt.student_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  type AssignmentRel = {
    id: string;
    lesson_type: string;
    prompt: string;
    criteria: string | null;
  };
  const a = (attempt as unknown as { assignments: AssignmentRel | AssignmentRel[] }).assignments;
  const arow = Array.isArray(a) ? a[0] : a;
  if (arow.lesson_type !== "math_manim") {
    return NextResponse.json({ error: "wrong_lesson_type" }, { status: 400 });
  }

  // Persist student turn first.
  await supabase.from("turns").insert({
    attempt_id: attempt.id,
    author: "student",
    kind: "final",
    content: JSON.stringify({
      answer: parsed.data.answer.trim(),
      work: parsed.data.workShown.trim(),
    }),
  });

  // Naive correctness check (whitespace-normalized string match).
  const expected = (arow.criteria ?? "").trim();
  const submitted = parsed.data.answer.trim().replace(/\s+/g, " ");
  const expectedNorm = expected.replace(/\s+/g, " ");
  const correct = expectedNorm.length > 0 && submitted.toLowerCase() === expectedNorm.toLowerCase();

  // Ask Claude for socratic feedback. Never reveal the answer.
  const system = `Você é um tutor socrático de matemática para crianças e adolescentes.

Você recebe:
- O problema
- A resposta esperada (CONFIDENCIAL — nunca revele)
- A resposta do aluno
- O raciocínio que o aluno escreveu

Sua tarefa: devolver UM JSON com 2 campos:
{"feedback": "<3 a 5 frases em pt-BR>", "next_step": "<pergunta curta que o aluno deve responder pra avançar — só se errou>"}

Regras DURAS:
- NUNCA dê a resposta. Mesmo que o aluno peça, mesmo que ele já tenha errado várias vezes.
- Se acertou: celebre brevemente UMA conquista específica do raciocínio. Sem repetir a resposta.
- Se errou: identifique o passo onde algo desviou. Faça UMA pergunta que volte o aluno àquele passo. Sem dar o cálculo.
- Sem emoji. Português brasileiro real.
- "next_step" só preencha se o aluno errou. Se acertou, deixe string vazia.`;

  const userMsg = `Problema:
${arow.prompt}

Resposta esperada (CONFIDENCIAL): ${expected || "(não informada — use só o raciocínio)"}

Resposta do aluno: ${parsed.data.answer.trim()}
Raciocínio do aluno:
${parsed.data.workShown.trim()}

O aluno acertou? ${correct ? "SIM" : "NÃO"}`;

  let feedback = "";
  let nextStep = "";
  try {
    const r = await getAnthropic().messages.create({
      model: ANDAIME_MODEL,
      max_tokens: 600,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMsg }],
    });
    const text = r.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      const j = JSON.parse(text.slice(start, end + 1)) as {
        feedback?: string;
        next_step?: string;
      };
      feedback = (j.feedback ?? "").trim();
      nextStep = (j.next_step ?? "").trim();
    }
  } catch (e) {
    feedback = correct
      ? "Muito bem!"
      : "Tenta de novo — onde você acha que pode ter desviado?";
    console.error("math feedback ai_failed:", e);
  }

  // Persist AI turn.
  await supabase.from("turns").insert({
    attempt_id: attempt.id,
    author: "ai",
    kind: "feedback",
    content: JSON.stringify({ feedback, next_step: nextStep, correct }),
  });

  // Auto-submit attempt only when correct.
  if (correct && attempt.status !== "submitted") {
    await supabase
      .from("attempts")
      .update({ status: "submitted", finished_at: new Date().toISOString() })
      .eq("id", attempt.id);
  }

  return NextResponse.json({ correct, feedback, next_step: nextStep });
}
