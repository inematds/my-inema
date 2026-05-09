import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateBookForAttempt } from "@/lib/junior/book";

export const runtime = "nodejs";

// Junior assignments don't need an initial draft — the kid's first character
// is the start of the work. Essay assignments still require a written start.
const BodySchema = z.object({
  assignmentId: z.guid(),
  initial: z.string().max(10000).optional().default(""),
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
    .select("id, min_initial_chars, lesson_type, class_id")
    .eq("id", assignmentId)
    .single();
  if (!assignment) {
    return NextResponse.json({ error: "assignment_not_found" }, { status: 404 });
  }

  // Verify enrollment.
  const { data: enrolled } = await supabase
    .from("enrollments")
    .select("class_id")
    .eq("class_id", assignment.class_id)
    .eq("student_id", user.id)
    .maybeSingle();
  if (!enrolled) {
    return NextResponse.json({ error: "not_enrolled" }, { status: 403 });
  }

  // Reuse existing attempt if any (UNIQUE on assignment_id + student_id).
  const { data: existing } = await supabase
    .from("attempts")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (existing) {
    if (assignment.lesson_type === "junior_books") {
      await getOrCreateBookForAttempt(existing.id, user.id);
    }
    return NextResponse.json({ attemptId: existing.id });
  }

  // Essay path enforces a meaningful initial draft.
  if (assignment.lesson_type === "essay") {
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

  if (assignment.lesson_type === "essay") {
    await supabase.from("turns").insert({
      attempt_id: attempt.id,
      author: "student",
      kind: "initial",
      content: initial,
    });
  } else if (assignment.lesson_type === "junior_books") {
    // Pre-create the bound junior_book so the workspace state is ready.
    await getOrCreateBookForAttempt(attempt.id, user.id);
  }

  await supabase.from("event_log").insert({
    user_id: user.id,
    attempt_id: attempt.id,
    event_type: "attempt_started",
    payload: {
      lesson_type: assignment.lesson_type,
      initial_chars: initial.length,
    },
  });

  return NextResponse.json({ attemptId: attempt.id });
}
