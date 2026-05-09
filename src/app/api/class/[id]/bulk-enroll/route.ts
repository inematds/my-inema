import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 60;

const ParamsSchema = z.object({ id: z.guid() });
const BodySchema = z.object({
  // List of usernames to enroll. Creates accounts on the fly with a default
  // password (returned to teacher so they can hand it out).
  usernames: z.array(z.string().min(2).max(40)).min(1).max(60),
});

const INTERNAL_DOMAIN = "andaime.local";

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

function randomPassword() {
  // 8-char password, easy to type but not trivial. lowercase + digits.
  const alpha = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += alpha[Math.floor(Math.random() * alpha.length)];
  return s;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = ParamsSchema.safeParse(await ctx.params);
  if (!params.success) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: cls } = await supabase
    .from("classes")
    .select("teacher_id")
    .eq("id", params.data.id)
    .single();
  if (!cls) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (cls.teacher_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const service = createServiceClient();
  const results: {
    username: string;
    password?: string;
    status: "created" | "existing" | "enrolled" | "skipped" | "error";
    detail?: string;
  }[] = [];

  // Process serially to keep error messages comprehensible. Volume cap is 60.
  for (const raw of body.data.usernames) {
    const u = normalizeUsername(raw);
    if (u.length < 2 || !/^[a-z0-9._-]+$/.test(u)) {
      results.push({ username: raw, status: "skipped", detail: "invalid username" });
      continue;
    }
    const email = `${u}@${INTERNAL_DOMAIN}`;
    let userId: string | null = null;
    let password: string | undefined;

    // Try to find existing public user by email.
    const { data: existing } = await service
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      userId = existing.id;
      results.push({ username: u, status: "existing" });
    } else {
      // Create via admin API (service role).
      password = randomPassword();
      const { data: created, error: createErr } =
        await service.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name: u, username: u, role: "student" },
        });
      if (createErr || !created.user) {
        results.push({
          username: u,
          status: "error",
          detail: createErr?.message ?? "create_failed",
        });
        continue;
      }
      userId = created.user.id;
      results.push({ username: u, password, status: "created" });
    }

    if (userId) {
      const { error: enrollErr } = await service
        .from("enrollments")
        .insert({ class_id: params.data.id, student_id: userId });
      const last = results[results.length - 1];
      if (enrollErr && !enrollErr.message.includes("duplicate")) {
        last.status = "error";
        last.detail = enrollErr.message;
      } else if (last.status === "existing") {
        last.status = "enrolled";
      }
    }
  }

  return NextResponse.json({ results });
}
