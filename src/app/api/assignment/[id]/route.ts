import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ParamsSchema = z.object({ id: z.guid() });
const PatchSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  prompt: z.string().max(8000).optional(),
  criteria: z.string().max(4000).nullable().optional(),
});

async function ensureAssignmentTeacher(assignmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      err: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
      supabase: null,
      classId: null,
    };
  }
  const { data: a } = await supabase
    .from("assignments")
    .select("id, class_id, classes!inner(teacher_id)")
    .eq("id", assignmentId)
    .single();
  if (!a) {
    return {
      err: NextResponse.json({ error: "not_found" }, { status: 404 }),
      supabase: null,
      classId: null,
    };
  }
  const cls = Array.isArray(a.classes) ? a.classes[0] : a.classes;
  if (cls?.teacher_id !== user.id) {
    return {
      err: NextResponse.json({ error: "forbidden" }, { status: 403 }),
      supabase: null,
      classId: null,
    };
  }
  return { err: null, supabase, classId: a.class_id };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = ParamsSchema.safeParse(await ctx.params);
  if (!params.success) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  const body = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { err, supabase } = await ensureAssignmentTeacher(params.data.id);
  if (err) return err;

  const update: {
    title?: string;
    prompt?: string;
    criteria?: string | null;
  } = {};
  if (body.data.title !== undefined) update.title = body.data.title.trim();
  if (body.data.prompt !== undefined) update.prompt = body.data.prompt.trim();
  if (body.data.criteria !== undefined) update.criteria = body.data.criteria;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }

  const { error } = await supabase!
    .from("assignments")
    .update(update)
    .eq("id", params.data.id);
  if (error)
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = ParamsSchema.safeParse(await ctx.params);
  if (!params.success) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  const { err, supabase } = await ensureAssignmentTeacher(params.data.id);
  if (err) return err;
  const { error } = await supabase!
    .from("assignments")
    .delete()
    .eq("id", params.data.id);
  if (error)
    return NextResponse.json({ error: "delete_failed", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
