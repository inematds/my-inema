import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type JuniorBook = {
  id: string;
  session_token: string | null;
  user_id: string | null;
  attempt_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
  lesson_type: string;
  published_at: string | null;
  published_title: string | null;
  published_scope: "class" | "global";
};

/**
 * Look up the current user's "general" Junior book — the one not tied to any
 * classroom attempt. Creates one on first call. Auth required (Slice 6 droppped
 * anonymous cookie creation).
 */
export async function getOrCreateBookForUser(userId: string): Promise<JuniorBook> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("junior_books")
    .select("*")
    .eq("user_id", userId)
    .is("attempt_id", null)
    .maybeSingle();
  if (existing) return existing as JuniorBook;

  const { data, error } = await supabase
    .from("junior_books")
    .insert({ user_id: userId, lesson_type: "junior_books" })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Failed to create junior book for user: ${error?.message ?? "unknown"}`);
  }
  return data as JuniorBook;
}

/**
 * Get-or-create a Junior book bound to a specific classroom attempt. Validates
 * the caller is the student of that attempt and that the assignment is of type
 * "junior_books". 1 attempt = 1 book (UNIQUE on attempt_id).
 */
export async function getOrCreateBookForAttempt(
  attemptId: string,
  userId: string,
): Promise<JuniorBook> {
  const supabase = createServiceClient();

  // Validate attempt + assignment type + ownership.
  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, student_id, assignment_id, assignments!inner(lesson_type)")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) {
    throw new Error("attempt_not_found");
  }
  if (attempt.student_id !== userId) {
    throw new Error("not_attempt_owner");
  }
  type WithAssignment = { assignments: { lesson_type: string } | { lesson_type: string }[] };
  const a = (attempt as unknown as WithAssignment).assignments;
  const lessonType = Array.isArray(a) ? a[0]?.lesson_type : a?.lesson_type;
  if (lessonType !== "junior_books") {
    throw new Error("not_junior_assignment");
  }

  const { data: existing } = await supabase
    .from("junior_books")
    .select("*")
    .eq("attempt_id", attemptId)
    .maybeSingle();
  if (existing) return existing as JuniorBook;

  const { data, error } = await supabase
    .from("junior_books")
    .insert({
      user_id: userId,
      attempt_id: attemptId,
      lesson_type: "junior_books",
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Failed to create junior book for attempt: ${error?.message ?? "unknown"}`);
  }
  return data as JuniorBook;
}

/**
 * Resolve which Junior book this request is operating on.
 * - if header `x-attempt-id` present and user enrolled → attempt-bound book
 * - else → user's general book
 * - if anonymous → throw `auth_required`
 */
export async function resolveBook(req: Request): Promise<JuniorBook> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("auth_required");
  }
  const attemptId = req.headers.get("x-attempt-id");
  if (attemptId) {
    return getOrCreateBookForAttempt(attemptId, user.id);
  }
  return getOrCreateBookForUser(user.id);
}

/**
 * Read-only lookup. Returns null if anonymous or no book yet exists.
 * Does NOT create on miss.
 */
export async function getBookOrNull(req?: Request): Promise<JuniorBook | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const attemptId = req?.headers.get("x-attempt-id");
  const service = createServiceClient();

  if (attemptId) {
    const { data } = await service
      .from("junior_books")
      .select("*")
      .eq("attempt_id", attemptId)
      .eq("user_id", user.id)
      .maybeSingle();
    return (data as JuniorBook) ?? null;
  }

  const { data } = await service
    .from("junior_books")
    .select("*")
    .eq("user_id", user.id)
    .is("attempt_id", null)
    .maybeSingle();
  return (data as JuniorBook) ?? null;
}

/**
 * Convenience wrapper for API routes: returns either the book or a NextResponse
 * with the appropriate status code. Avoids repeating the try/catch pattern.
 */
export async function resolveBookOrError(
  req: Request,
): Promise<JuniorBook | NextResponse> {
  try {
    return await resolveBook(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    switch (msg) {
      case "auth_required":
        return NextResponse.json({ error: "auth_required" }, { status: 401 });
      case "attempt_not_found":
        return NextResponse.json({ error: "attempt_not_found" }, { status: 404 });
      case "not_attempt_owner":
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      case "not_junior_assignment":
        return NextResponse.json({ error: "wrong_lesson_type" }, { status: 400 });
      default:
        return NextResponse.json(
          { error: "book_resolve_failed", detail: msg },
          { status: 500 },
        );
    }
  }
}
