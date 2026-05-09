import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const ParamsSchema = z.object({ id: z.guid() });

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const parsed = ParamsSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: book, error } = await supabase
    .from("junior_books")
    .select("id, lesson_type, published_title, published_at")
    .eq("id", parsed.data.id)
    .not("published_at", "is", null)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "fetch_failed", detail: error.message }, { status: 500 });
  }
  if (!book) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: scenes } = await supabase
    .from("junior_scenes")
    .select("id, name, epithet, image_data, position")
    .eq("book_id", book.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  return NextResponse.json({
    publication: {
      id: book.id,
      lesson_type: book.lesson_type,
      title: book.published_title,
      published_at: book.published_at,
      scenes: scenes ?? [],
    },
  });
}
