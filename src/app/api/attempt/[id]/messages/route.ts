import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const ParamsSchema = z.object({ id: z.guid() });
const BodySchema = z.object({
  body: z.string().min(1).max(4000),
});

// Returns either { teacherId, studentId, isTeacher, userId } or a NextResponse error.
async function authorizeAttempt(attemptId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      err: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
      ctx: null,
    };
  }
  const { data: a } = await supabase
    .from("attempts")
    .select("id, student_id, assignments!inner(class_id, classes!inner(teacher_id))")
    .eq("id", attemptId)
    .single();
  if (!a) {
    return {
      err: NextResponse.json({ error: "not_found" }, { status: 404 }),
      ctx: null,
    };
  }
  type AssignmentRel = {
    class_id: string;
    classes: { teacher_id: string } | { teacher_id: string }[];
  };
  const aa = (a as unknown as { assignments: AssignmentRel | AssignmentRel[] }).assignments;
  const arow = Array.isArray(aa) ? aa[0] : aa;
  const cls = Array.isArray(arow.classes) ? arow.classes[0] : arow.classes;
  const teacherId = cls?.teacher_id;
  const studentId = a.student_id;
  const isTeacher = teacherId === user.id;
  const isStudent = studentId === user.id;
  if (!isTeacher && !isStudent) {
    return {
      err: NextResponse.json({ error: "forbidden" }, { status: 403 }),
      ctx: null,
    };
  }
  return {
    err: null,
    ctx: {
      userId: user.id,
      teacherId,
      studentId,
      isTeacher,
    },
  };
}

export async function GET(_req: Request, ctxReq: { params: Promise<{ id: string }> }) {
  const params = ParamsSchema.safeParse(await ctxReq.params);
  if (!params.success) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  const { err } = await authorizeAttempt(params.data.id);
  if (err) return err;

  const service = createServiceClient();
  const { data, error } = await service
    .from("attempt_messages")
    .select("id, author_id, body, created_at, users!inner(name, role)")
    .eq("attempt_id", params.data.id)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: "fetch_failed", detail: error.message }, { status: 500 });
  }
  type Row = {
    id: string;
    author_id: string;
    body: string;
    created_at: string;
    users: { name: string; role: string } | { name: string; role: string }[];
  };
  const messages = ((data ?? []) as Row[]).map((m) => {
    const u = Array.isArray(m.users) ? m.users[0] : m.users;
    return {
      id: m.id,
      author_id: m.author_id,
      body: m.body,
      created_at: m.created_at,
      author_name: u?.name ?? null,
      author_role: u?.role ?? null,
    };
  });
  return NextResponse.json({ messages });
}

export async function POST(req: Request, ctxReq: { params: Promise<{ id: string }> }) {
  const params = ParamsSchema.safeParse(await ctxReq.params);
  if (!params.success) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { err, ctx } = await authorizeAttempt(params.data.id);
  if (err) return err;

  const service = createServiceClient();
  const { data: msg, error } = await service
    .from("attempt_messages")
    .insert({
      attempt_id: params.data.id,
      author_id: ctx!.userId,
      body: body.data.body.trim(),
    })
    .select("id, body, created_at")
    .single();
  if (error || !msg) {
    return NextResponse.json(
      { error: "send_failed", detail: error?.message },
      { status: 500 },
    );
  }

  // Notification to the counterpart.
  const recipient = ctx!.isTeacher ? ctx!.studentId : ctx!.teacherId;
  if (recipient && recipient !== ctx!.userId) {
    await service.from("notifications").insert({
      user_id: recipient,
      kind: "message_received",
      payload: {
        attempt_id: params.data.id,
        from_id: ctx!.userId,
        excerpt: body.data.body.trim().slice(0, 100),
      },
    });
  }

  return NextResponse.json({ message: msg });
}
