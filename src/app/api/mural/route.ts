import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

// Public mural: lists every published book across all sessions. Returns the
// first scene's image as a thumbnail so the grid renders without N+1 reads.
export async function GET() {
  const supabase = createServiceClient();

  const { data: books, error } = await supabase
    .from("junior_books")
    .select(
      "id, lesson_type, published_title, published_at, junior_scenes(image_data, position)",
    )
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(120);

  if (error) {
    return NextResponse.json({ error: "fetch_failed", detail: error.message }, { status: 500 });
  }

  type BookRow = {
    id: string;
    lesson_type: string;
    published_title: string | null;
    published_at: string;
    junior_scenes: { image_data: string | null; position: number }[];
  };

  const publications = ((books ?? []) as BookRow[]).map((b) => {
    const ordered = [...(b.junior_scenes ?? [])].sort(
      (a, c) => a.position - c.position,
    );
    const cover = ordered[0]?.image_data ?? null;
    return {
      id: b.id,
      lesson_type: b.lesson_type,
      title: b.published_title,
      published_at: b.published_at,
      scene_count: ordered.length,
      cover_image_data: cover,
    };
  });

  return NextResponse.json({ publications });
}
