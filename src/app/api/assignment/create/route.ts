import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BodySchema = z.object({
  classId: z.guid(),
  title: z.string().min(5).max(200),
  prompt: z.string().min(20).max(8000),
  criteria: z.string().max(4000).nullable(),
  maxHints: z.number().int().min(1).max(20),
  minInitialChars: z.number().int().min(50).max(2000),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", detail: parsed.error.message }, { status: 400 });
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
    })
    .select("id")
    .single();

  if (error || !assignment) {
    return NextResponse.json({ error: "create_failed", detail: error?.message }, { status: 500 });
  }

  return NextResponse.json({ assignmentId: assignment.id });
}
