import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BodySchema = z.object({
  classId: z.guid(),
  title: z.string().min(5).max(200),
  // Junior assignments have an optional briefing; essay enforces 20+.
  prompt: z.string().max(8000).default(""),
  criteria: z.string().max(4000).nullable().default(null),
  maxHints: z.number().int().min(1).max(20).default(3),
  minInitialChars: z.number().int().min(0).max(2000).default(200),
  lessonType: z.enum(["essay", "junior_books", "math_manim"]).default("essay"),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", detail: parsed.error.message }, { status: 400 });
  }

  // Per-type tightening: essays still need a real prompt.
  if (parsed.data.lessonType === "essay" && parsed.data.prompt.trim().length < 20) {
    return NextResponse.json(
      { error: "invalid_body", detail: "essay prompt must be 20+ chars" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: cls } = await supabase
    .from("classes")
    .select("id, teacher_id")
    .eq("id", parsed.data.classId)
    .single();
  if (!cls || cls.teacher_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: assignment, error } = await supabase
    .from("assignments")
    .insert({
      class_id: parsed.data.classId,
      title: parsed.data.title,
      prompt: parsed.data.prompt,
      criteria: parsed.data.criteria,
      max_hints: parsed.data.maxHints,
      min_initial_chars: parsed.data.minInitialChars,
      lesson_type: parsed.data.lessonType,
    })
    .select("id")
    .single();

  if (error || !assignment) {
    return NextResponse.json({ error: "create_failed", detail: error?.message }, { status: 500 });
  }

  // Notify all enrolled students of the new assignment.
  const { data: enrolled } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("class_id", parsed.data.classId);
  if (enrolled && enrolled.length > 0) {
    await supabase.from("notifications").insert(
      enrolled.map((e) => ({
        user_id: e.student_id,
        kind: "new_assignment",
        payload: {
          assignment_id: assignment.id,
          title: parsed.data.title,
          lesson_type: parsed.data.lessonType,
        },
      })),
    );
  }

  return NextResponse.json({ assignmentId: assignment.id });
}
