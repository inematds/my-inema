import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BodySchema = z.object({
  assignmentId: z.guid(),
  initial: z.string().min(1).max(10000),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { assignmentId, initial } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, min_initial_chars")
    .eq("id", assignmentId)
    .single();
  if (!assignment) {
    return NextResponse.json({ error: "assignment_not_found" }, { status: 404 });
  }
  if (initial.trim().length < assignment.min_initial_chars) {
    return NextResponse.json(
      {
        error: "initial_too_short",
        required: assignment.min_initial_chars,
        got: initial.trim().length,
      },
      { status: 400 },
    );
  }

  const { data: attempt, error } = await supabase
    .from("attempts")
    .insert({
      assignment_id: assignmentId,
      student_id: user.id,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (error || !attempt) {
    return NextResponse.json(
      { error: "attempt_create_failed", detail: error?.message },
      { status: 500 },
    );
  }

  await supabase.from("turns").insert({
    attempt_id: attempt.id,
    author: "student",
    kind: "initial",
    content: initial,
  });

  await supabase.from("event_log").insert({
    user_id: user.id,
    attempt_id: attempt.id,
    event_type: "attempt_started",
    payload: { initial_chars: initial.length },
  });

  return NextResponse.json({ attemptId: attempt.id });
}
