import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ParamsSchema = z.object({ id: z.guid() });
const BodySchema = z.object({
  attemptId: z.guid().nullable(),
});

// Teacher-only: toggle which attempt is featured for the assignment.
// Pass attemptId=null to clear the highlight.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = ParamsSchema.safeParse(await ctx.params);
  if (!params.success) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, class_id, classes!inner(teacher_id)")
    .eq("id", params.data.id)
    .single();
  if (!assignment) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const cls = Array.isArray(assignment.classes) ? assignment.classes[0] : assignment.classes;
  if (cls?.teacher_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // If setting (not clearing), validate the attempt belongs to this assignment.
  if (body.data.attemptId) {
    const { data: at } = await supabase
      .from("attempts")
      .select("id, assignment_id")
      .eq("id", body.data.attemptId)
      .single();
    if (!at || at.assignment_id !== params.data.id) {
      return NextResponse.json({ error: "attempt_not_in_assignment" }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from("assignments")
    .update({ featured_attempt_id: body.data.attemptId })
    .eq("id", params.data.id);
  if (error) {
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }

  // Notify the student that their work is featured.
  if (body.data.attemptId) {
    const { data: at } = await supabase
      .from("attempts")
      .select("student_id")
      .eq("id", body.data.attemptId)
      .single();
    if (at?.student_id) {
      await supabase.from("notifications").insert({
        user_id: at.student_id,
        kind: "attempt_featured",
        payload: { attempt_id: body.data.attemptId, assignment_id: params.data.id },
      });
    }
  }

  return NextResponse.json({ ok: true, featured_attempt_id: body.data.attemptId });
}
