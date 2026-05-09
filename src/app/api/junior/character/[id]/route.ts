import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookOrNull } from "@/lib/junior/book";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const ParamsSchema = z.object({ id: z.guid() });

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const parsed = ParamsSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  const book = await getBookOrNull(req);
  if (!book) return NextResponse.json({ error: "no_book" }, { status: 404 });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("junior_characters")
    .delete()
    .eq("id", parsed.data.id)
    .eq("book_id", book.id);
  if (error) {
    return NextResponse.json({ error: "delete_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
