import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Allow a logged-in student to upgrade themselves to teacher or parent.
// Refuses to demote — to switch back to student, use a dedicated admin path
// (not in MVP). Refuses if user is already teacher/parent (avoid silent role
// changes between privileged classes).
const BodySchema = z.object({
  role: z.enum(["teacher", "parent"]),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "no_profile" }, { status: 404 });
  }

  if (profile.role === parsed.data.role) {
    return NextResponse.json({ ok: true, role: profile.role });
  }

  if (profile.role !== "student") {
    return NextResponse.json(
      { error: "already_privileged", currentRole: profile.role },
      { status: 409 },
    );
  }

  const { error } = await supabase
    .from("users")
    .update({ role: parsed.data.role })
    .eq("id", user.id);
  if (error) {
    return NextResponse.json(
      { error: "update_failed", detail: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, role: parsed.data.role });
}
