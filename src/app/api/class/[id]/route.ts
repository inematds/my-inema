import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ParamsSchema = z.object({ id: z.guid() });
const PatchSchema = z.object({
  name: z.string().min(3).max(120),
});

async function ensureTeacherOf(classId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      err: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
      supabase: null,
    };
  const { data: cls } = await supabase
    .from("classes")
    .select("teacher_id")
    .eq("id", classId)
    .single();
  if (!cls) {
    return {
      err: NextResponse.json({ error: "not_found" }, { status: 404 }),
      supabase: null,
    };
  }
  if (cls.teacher_id !== user.id) {
    return {
      err: NextResponse.json({ error: "forbidden" }, { status: 403 }),
      supabase: null,
    };
  }
  return { err: null, supabase };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = ParamsSchema.safeParse(await ctx.params);
  if (!params.success) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  const body = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { err, supabase } = await ensureTeacherOf(params.data.id);
  if (err) return err;
  const { error } = await supabase!
    .from("classes")
    .update({ name: body.data.name.trim() })
    .eq("id", params.data.id);
  if (error)
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = ParamsSchema.safeParse(await ctx.params);
  if (!params.success) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  const { err, supabase } = await ensureTeacherOf(params.data.id);
  if (err) return err;
  // Cascades delete enrollments, assignments, attempts, turns, junior_books
  // (via attempt_id FK on delete cascade).
  const { error } = await supabase!
    .from("classes")
    .delete()
    .eq("id", params.data.id);
  if (error)
    return NextResponse.json({ error: "delete_failed", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
