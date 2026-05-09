import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const ParamsSchema = z.object({ id: z.guid() });
const BodySchema = z.object({
  body: z.string().min(1).max(2000),
});

async function ensureTeacherOfAttempt(attemptId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      err: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
      user: null,
    };
  }
  const { data: a } = await supabase
    .from("attempts")
    .select("id, assignments!inner(class_id, classes!inner(teacher_id))")
    .eq("id", attemptId)
    .single();
  if (!a) {
    return {
      err: NextResponse.json({ error: "not_found" }, { status: 404 }),
      user: null,
    };
  }
  type AssignmentRel = {
    class_id: string;
    classes: { teacher_id: string } | { teacher_id: string }[];
  };
  const aa = (a as unknown as { assignments: AssignmentRel | AssignmentRel[] }).assignments;
  const arow = Array.isArray(aa) ? aa[0] : aa;
  const cls = Array.isArray(arow.classes) ? arow.classes[0] : arow.classes;
  if (cls?.teacher_id !== user.id) {
    return {
      err: NextResponse.json({ error: "forbidden" }, { status: 403 }),
      user: null,
    };
  }
  return { err: null, user };
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = ParamsSchema.safeParse(await ctx.params);
  if (!params.success) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { err, user } = await ensureTeacherOfAttempt(params.data.id);
  if (err) return err;

  const service = createServiceClient();
  const { error } = await service
    .from("attempt_feedback")
    .upsert(
      {
        attempt_id: params.data.id,
        teacher_id: user!.id,
        body: body.data.body.trim(),
      },
      { onConflict: "attempt_id" },
    );
  if (error)
    return NextResponse.json({ error: "save_failed", detail: error.message }, { status: 500 });

  // Notify the student.
  const { data: at } = await service
    .from("attempts")
    .select("student_id")
    .eq("id", params.data.id)
    .single();
  if (at?.student_id) {
    await service.from("notifications").insert({
      user_id: at.student_id,
      kind: "book_feedback",
      payload: {
        attempt_id: params.data.id,
        excerpt: body.data.body.trim().slice(0, 120),
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = ParamsSchema.safeParse(await ctx.params);
  if (!params.success) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  const { err } = await ensureTeacherOfAttempt(params.data.id);
  if (err) return err;
  const service = createServiceClient();
  const { error } = await service
    .from("attempt_feedback")
    .delete()
    .eq("attempt_id", params.data.id);
  if (error)
    return NextResponse.json({ error: "delete_failed", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
