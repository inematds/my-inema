import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ANDAIME_SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { classifyAnswerRequest } from "@/lib/ai/intent-classifier";
import { getAnthropic, ANDAIME_MODEL } from "@/lib/ai/anthropic";

export const runtime = "nodejs";

const BodySchema = z.object({
  attemptId: z.guid(),
  content: z.string().min(1).max(5000),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { attemptId, content } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Verify attempt belongs to user (RLS will also enforce on insert, this gives a friendlier error)
  const { data: attempt, error: attErr } = await supabase
    .from("attempts")
    .select("id, student_id, status, assignment_id")
    .eq("id", attemptId)
    .single();
  if (attErr || !attempt || attempt.student_id !== user.id) {
    return NextResponse.json({ error: "attempt_not_found" }, { status: 404 });
  }
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "attempt_locked" }, { status: 409 });
  }

  // Load assignment for prompt context
  const { data: assignment } = await supabase
    .from("assignments")
    .select("title, prompt, criteria, max_hints")
    .eq("id", attempt.assignment_id)
    .single();

  // Insert student turn
  const { error: insertErr } = await supabase.from("turns").insert({
    attempt_id: attemptId,
    author: "student",
    kind: "revision",
    content,
  });
  if (insertErr) {
    return NextResponse.json({ error: "insert_failed", detail: insertErr.message }, { status: 500 });
  }

  // Pre-classifier (deterministic, no token spend)
  const classification = classifyAnswerRequest(content);
  if (classification.isAnswerRequest && classification.redirect) {
    await supabase.from("turns").insert({
      attempt_id: attemptId,
      author: "ai",
      kind: "question",
      content: classification.redirect,
      tokens_used: 0,
    });
    return NextResponse.json({ reply: classification.redirect, source: "classifier" });
  }

  // Load conversation history (turns)
  const { data: history } = await supabase
    .from("turns")
    .select("author, kind, content, created_at")
    .eq("attempt_id", attemptId)
    .order("created_at", { ascending: true });

  type AnthropicMessage = { role: "user" | "assistant"; content: string };
  const messages: AnthropicMessage[] = [];
  for (const t of history ?? []) {
    if (t.author === "student") {
      messages.push({ role: "user", content: t.content });
    } else if (t.author === "ai") {
      messages.push({ role: "assistant", content: t.content });
    }
  }

  // Prepend assignment context as the very first user message (helps Claude ground)
  const taskContext = `# Tarefa\n**Título:** ${assignment?.title ?? ""}\n\n**Enunciado:**\n${assignment?.prompt ?? ""}\n\n${assignment?.criteria ? `**Critérios:**\n${assignment.criteria}\n\n` : ""}---\n\nLembre: você é o Andaime. Nunca dê a resposta. Sempre devolva uma pergunta orientadora baseada no que o aluno escreve.`;

  // Build full message list: first a system-style user-turn with task context, then the dialog
  const fullMessages: AnthropicMessage[] = [
    { role: "user", content: taskContext },
    { role: "assistant", content: "Entendido. Vou conduzir o aluno por perguntas. Compartilhe sua tentativa." },
    ...messages,
  ];

  // Call Anthropic
  let aiText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  try {
    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: ANDAIME_MODEL,
      max_tokens: 600,
      system: [
        {
          type: "text",
          text: ANDAIME_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: fullMessages,
    });
    const block = response.content[0];
    aiText = block && block.type === "text" ? block.text : "";
    inputTokens = response.usage.input_tokens;
    outputTokens = response.usage.output_tokens;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "ai_failed", detail: msg }, { status: 502 });
  }

  // Post-validator: refuse if reply looks like it gave away a complete answer
  const looksLikeFullAnswer =
    aiText.length > 800 ||
    /^(a resposta (é|certa)|veja a resposta|aqui está a resposta)\b/im.test(aiText);

  if (looksLikeFullAnswer) {
    aiText =
      "Quase respondi por você — vou recuar. Volte um passo: do que você escreveu, qual parte você tem mais certeza, e por quê?";
  }

  await supabase.from("turns").insert({
    attempt_id: attemptId,
    author: "ai",
    kind: "question",
    content: aiText,
    tokens_used: inputTokens + outputTokens,
  });

  await supabase.from("event_log").insert({
    user_id: user.id,
    attempt_id: attemptId,
    event_type: "ai_turn",
    payload: { input_tokens: inputTokens, output_tokens: outputTokens },
  });

  return NextResponse.json({ reply: aiText, source: "ai" });
}
