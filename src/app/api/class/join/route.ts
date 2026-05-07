import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BodySchema = z.object({ code: z.string().min(3).max(20) });

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: cls } = await supabase
    .from("classes")
    .select("id")
    .eq("code", parsed.data.code)
    .maybeSingle();

  if (!cls) return NextResponse.json({ error: "class_not_found" }, { status: 404 });

  const { error } = await supabase.from("enrollments").insert({
    class_id: cls.id,
    student_id: user.id,
  });
  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: "join_failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, classId: cls.id });
}
