import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BodySchema = z.object({
  attemptId: z.guid(),
  finalContent: z.string().min(1).max(20000),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { attemptId, finalContent } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, student_id, assignment_id, status")
    .eq("id", attemptId)
    .single();
  if (!attempt || attempt.student_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "already_finalized" }, { status: 409 });
  }

  // Insert final turn
  await supabase.from("turns").insert({
    attempt_id: attemptId,
    author: "student",
    kind: "final",
    content: finalContent,
  });

  // Compute simple autonomy score: weighted by hints used vs allowed
  const { data: turns } = await supabase
    .from("turns")
    .select("author, kind, content")
    .eq("attempt_id", attemptId)
    .order("created_at", { ascending: true });

  const aiTurns = (turns ?? []).filter((t) => t.author === "ai").length;
  const initialTurn = (turns ?? []).find((t) => t.kind === "initial");
  const initialLen = initialTurn?.content.length ?? 0;
  const finalLen = finalContent.length;

  const { data: assignment } = await supabase
    .from("assignments")
    .select("max_hints")
    .eq("id", attempt.assignment_id)
    .single();
  const maxHints = assignment?.max_hints ?? 3;

  // 0..1 — higher = more autonomous
  const hintComponent = Math.max(0, 1 - aiTurns / Math.max(1, maxHints));
  const growthComponent =
    initialLen > 0 ? Math.min(1, finalLen / Math.max(initialLen, 1) / 1.5) : 0;
  const autonomy = Number((0.5 * hintComponent + 0.5 * growthComponent).toFixed(2));

  await supabase
    .from("attempts")
    .update({
      status: "submitted",
      autonomy_score: autonomy,
      finished_at: new Date().toISOString(),
    })
    .eq("id", attemptId);

  await supabase.from("event_log").insert({
    user_id: user.id,
    attempt_id: attemptId,
    event_type: "attempt_finalized",
    payload: { autonomy, ai_turns: aiTurns, initial_len: initialLen, final_len: finalLen },
  });

  return NextResponse.json({ autonomy });
}
