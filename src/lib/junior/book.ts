import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

const COOKIE_NAME = "andaime_book_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type JuniorBook = {
  id: string;
  session_token: string;
  user_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
  lesson_type: string;
  published_at: string | null;
  published_title: string | null;
};

/**
 * Get-or-create the kid's anonymous "book" — identified by an httpOnly cookie.
 * Safe to call from a route handler (sets cookie on first visit). Calling from
 * a Server Component will read the cookie if present but cannot set new ones;
 * use this from route handlers and pages that mutate, not RSC reads.
 */
export async function getOrCreateBook(): Promise<JuniorBook> {
  const supabase = createServiceClient();
  const jar = await cookies();

  const existingToken = jar.get(COOKIE_NAME)?.value;
  if (existingToken) {
    const { data } = await supabase
      .from("junior_books")
      .select("*")
      .eq("session_token", existingToken)
      .maybeSingle();
    if (data) return data as JuniorBook;
  }

  const sessionToken = randomUUID();
  const { data, error } = await supabase
    .from("junior_books")
    .insert({ session_token: sessionToken })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Failed to create junior book: ${error?.message ?? "unknown"}`);
  }
  jar.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return data as JuniorBook;
}

/**
 * Read-only lookup. Returns null if no cookie or unknown token.
 */
export async function getBookOrNull(): Promise<JuniorBook | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("junior_books")
    .select("*")
    .eq("session_token", token)
    .maybeSingle();
  return (data as JuniorBook) ?? null;
}
