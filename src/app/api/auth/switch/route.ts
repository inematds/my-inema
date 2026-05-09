import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sign out current user and redirect to /login so they can enter another
// account. Different from /signout (which goes home) — this is the explicit
// "switch account" path used by the UserChip on shared devices.
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
