import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

// Public mural endpoint. Three modes:
// - default (no params): only books with published_scope='global'
// - ?assignmentId=<uuid>: books from attempts of that assignment, scope='class'
// - ?classId=<uuid>: books from any assignment of that class, scope='class'
export async function GET(req: Request) {
  const url = new URL(req.url);
  const assignmentId = url.searchParams.get("assignmentId");
  const classId = url.searchParams.get("classId");

  const supabase = createServiceClient();

  let query = supabase
    .from("junior_books")
    .select(
      "id, lesson_type, published_title, published_at, published_scope, attempt_id, attempts(assignment_id, assignments(class_id, title)), junior_scenes(image_data, position)",
    )
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(120);

  if (assignmentId || classId) {
    query = query.eq("published_scope", "class");
  } else {
    query = query.eq("published_scope", "global");
  }

  const { data: books, error } = await query;

  if (error) {
    return NextResponse.json({ error: "fetch_failed", detail: error.message }, { status: 500 });
  }

  type AttemptRel = { assignment_id: string; assignments: { class_id: string; title: string } | null } | null;
  type BookRow = {
    id: string;
    lesson_type: string;
    published_title: string | null;
    published_at: string;
    published_scope: string;
    attempt_id: string | null;
    attempts: AttemptRel;
    junior_scenes: { image_data: string | null; position: number }[];
  };

  const filtered = ((books ?? []) as BookRow[]).filter((b) => {
    if (assignmentId) return b.attempts?.assignment_id === assignmentId;
    if (classId) return b.attempts?.assignments?.class_id === classId;
    return true;
  });

  const publications = filtered.map((b) => {
    const ordered = [...(b.junior_scenes ?? [])].sort(
      (a, c) => a.position - c.position,
    );
    const cover = ordered[0]?.image_data ?? null;
    return {
      id: b.id,
      lesson_type: b.lesson_type,
      title: b.published_title,
      published_at: b.published_at,
      published_scope: b.published_scope,
      assignment_title: b.attempts?.assignments?.title ?? null,
      scene_count: ordered.length,
      cover_image_data: cover,
    };
  });

  return NextResponse.json({ publications });
}
