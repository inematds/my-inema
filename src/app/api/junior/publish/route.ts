import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookOrNull } from "@/lib/junior/book";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const BodySchema = z.object({
  title: z.string().min(1).max(120),
  scope: z.enum(["class", "global"]).default("global"),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const book = await getBookOrNull(req);
  if (!book) return NextResponse.json({ error: "no_book" }, { status: 404 });

  // Class-scope only makes sense when the book is bound to a classroom attempt.
  if (parsed.data.scope === "class" && !book.attempt_id) {
    return NextResponse.json({ error: "class_scope_requires_attempt" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Block publishing an empty book — must have at least one scene.
  const { count: sceneCount } = await supabase
    .from("junior_scenes")
    .select("id", { count: "exact", head: true })
    .eq("book_id", book.id);
  if (!sceneCount || sceneCount === 0) {
    return NextResponse.json({ error: "no_scenes" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("junior_books")
    .update({
      published_at: new Date().toISOString(),
      published_title: parsed.data.title.trim(),
      published_scope: parsed.data.scope,
    })
    .eq("id", book.id)
    .select("id, lesson_type, published_at, published_title, published_scope")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "publish_failed", detail: error?.message },
      { status: 500 },
    );
  }

  // If this book is tied to a classroom attempt, publishing closes the entrega.
  if (book.attempt_id) {
    await supabase
      .from("attempts")
      .update({ status: "submitted", finished_at: new Date().toISOString() })
      .eq("id", book.attempt_id);
  }

  return NextResponse.json({ publication: data });
}

// Unpublish — drop from the mural without deleting the book.
export async function DELETE(req: Request) {
  const book = await getBookOrNull(req);
  if (!book) return NextResponse.json({ error: "no_book" }, { status: 404 });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("junior_books")
    .update({ published_at: null, published_title: null })
    .eq("id", book.id);
  if (error) {
    return NextResponse.json({ error: "unpublish_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
