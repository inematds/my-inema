import { NextResponse } from "next/server";
import { z } from "zod";
import fs from "node:fs/promises";
import { createServiceClient } from "@/lib/supabase/service";
import { renderStorybook } from "@/lib/junior/render-storybook";

export const runtime = "nodejs";
export const maxDuration = 600; // 10min cap — render é demorado

const QuerySchema = z.object({ bookId: z.guid() });

// Synchronous server-side render of a published book to MP4 via Remotion.
// Public endpoint (mural is public): caller passes ?bookId=<uuid>.
// Returns the MP4 stream directly. For long renders, the connection must
// stay open — that's the price of skipping the job-queue layer in MVP.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ bookId: url.searchParams.get("bookId") });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_book_id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: book } = await supabase
    .from("junior_books")
    .select("id, published_at, published_title")
    .eq("id", parsed.data.bookId)
    .not("published_at", "is", null)
    .maybeSingle();
  if (!book) return NextResponse.json({ error: "not_found_or_unpublished" }, { status: 404 });

  const { data: scenes } = await supabase
    .from("junior_scenes")
    .select("id, name, epithet, image_data, position")
    .eq("book_id", book.id)
    .order("position", { ascending: true });

  if (!scenes || scenes.length === 0) {
    return NextResponse.json({ error: "no_scenes" }, { status: 400 });
  }

  try {
    const { path: filePath, durationS } = await renderStorybook({
      title: book.published_title ?? "Livro",
      scenes: scenes.map((s) => ({
        id: s.id,
        name: s.name,
        epithet: s.epithet,
        image_data: s.image_data,
      })),
    });

    const data = await fs.readFile(filePath);
    // Best effort cleanup; do not block response on failure.
    fs.unlink(filePath).catch(() => undefined);

    const safeName =
      (book.published_title ?? "livro")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 60) || "livro";

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${safeName}.mp4"`,
        "X-Render-Duration-S": durationS.toFixed(1),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "render_failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
