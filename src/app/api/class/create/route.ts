import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BodySchema = z.object({ name: z.string().min(3).max(120) });

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "ANDA-";
  for (let i = 0; i < 4; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Promote user to teacher (MVP: anyone creating a class becomes a teacher)
  const { data: profile } = await supabase
    .from("users")
    .select("role, school_id")
    .eq("id", user.id)
    .single();

  let schoolId = profile?.school_id;
  if (!schoolId) {
    const { data: school } = await supabase
      .from("schools")
      .insert({ name: "Andaime — Escola Padrão" })
      .select("id")
      .single();
    schoolId = school?.id ?? null;
    if (!schoolId) {
      return NextResponse.json({ error: "school_create_failed" }, { status: 500 });
    }
  }

  // Promote student → teacher when first creating a class. Parents keep the
  // 'parent' role (they're teacher-equivalent in capability but semantically
  // distinct).
  if (profile?.role === "student") {
    await supabase
      .from("users")
      .update({ role: "teacher", school_id: schoolId })
      .eq("id", user.id);
  } else if (!profile?.school_id) {
    await supabase.from("users").update({ school_id: schoolId }).eq("id", user.id);
  }

  // Generate unique code
  let code = generateCode();
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await supabase
      .from("classes")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!existing) break;
    code = generateCode();
  }

  const { data: cls, error } = await supabase
    .from("classes")
    .insert({
      school_id: schoolId,
      teacher_id: user.id,
      name: parsed.data.name,
      code,
    })
    .select("id")
    .single();

  if (error || !cls) {
    return NextResponse.json(
      { error: "class_create_failed", detail: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ classId: cls.id, code });
}
