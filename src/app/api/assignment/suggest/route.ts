import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, ANDAIME_MODEL } from "@/lib/ai/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  lessonType: z.enum(["essay", "junior_books"]),
  hint: z.string().max(500).optional().default(""),
});

// Asks Claude for a (title, prompt) pair tailored to the lesson type.
// Junior_books → playful, kid-friendly briefing pointing at characters/scenes.
// Essay → adolescent dissertative prompt with thesis structure.
export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // Auth: only authenticated teacher/parent should be able to use this.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const system =
    parsed.data.lessonType === "junior_books"
      ? `Você sugere uma tarefa "Andaime Junior · Book" para uma turma de crianças (8 a 12 anos).
Devolve EXATAMENTE um JSON, nada mais:
{"title": "<título curto e evocativo, 4 a 9 palavras>", "prompt": "<briefing curto, 2-4 frases, em pt-BR, convidando a criança a criar 1+ personagem, 1 cenário e 3 cenas>"}

Regras:
- Português brasileiro com palavras reais.
- Tom poético-infantil, com magia mas sem violência ou medo.
- Sem aspas nos valores. Sem reticências. Sem emoji.
- Briefing deve dar liberdade — não dite enredo, dite uma seed.`
      : `Você sugere uma tarefa de redação dissertativa para alunos do ensino médio (15-17 anos).
Devolve EXATAMENTE um JSON, nada mais:
{"title": "<título curto, 5-12 palavras>", "prompt": "<enunciado de redação, 3-6 frases, em pt-BR, exigindo tese, argumentos e conclusão>"}

Regras:
- Português brasileiro formal mas acessível.
- Tema relevante e contemporâneo, sem polarização política.
- Sem aspas nos valores. Sem emoji.`;

  const userMsg = parsed.data.hint.trim().length > 0
    ? `Pista do professor: "${parsed.data.hint.replace(/"/g, "'")}"`
    : "Sugira uma tarefa interessante (você escolhe o tema).";

  try {
    const r = await getAnthropic().messages.create({
      model: ANDAIME_MODEL,
      max_tokens: 400,
      system: [
        { type: "text", text: system, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userMsg }],
    });
    const text = r.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return NextResponse.json({ error: "bad_ai_output" }, { status: 502 });
    }
    const parsedJson = JSON.parse(text.slice(start, end + 1)) as {
      title?: string;
      prompt?: string;
    };
    return NextResponse.json({
      title: typeof parsedJson.title === "string" ? parsedJson.title.trim() : "",
      prompt: typeof parsedJson.prompt === "string" ? parsedJson.prompt.trim() : "",
    });
  } catch (e) {
    return NextResponse.json(
      { error: "ai_failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
