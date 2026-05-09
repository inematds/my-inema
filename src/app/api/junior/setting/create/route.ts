import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveBookOrError } from "@/lib/junior/book";
import { createServiceClient } from "@/lib/supabase/service";
import { illustrate } from "@/lib/junior/illustrate";

export const runtime = "nodejs";
export const maxDuration = 120;

const BodySchema = z.object({
  description: z.string().min(20).max(2000),
  seed: z.number().int().optional(),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { description, seed } = parsed.data;

  const bookOrErr = await resolveBookOrError(req);
  if (bookOrErr instanceof NextResponse) return bookOrErr;
  const book = bookOrErr;

  const outcome = await illustrate("setting", description, { seed });
  if (!outcome.ok) {
    const status =
      outcome.error.kind === "model_not_ready" || outcome.error.kind === "image_server_unreachable"
        ? 503
        : outcome.error.kind === "timeout"
          ? 504
          : 502;
    return NextResponse.json({ error: outcome.error.kind }, { status });
  }
  const result = outcome.result;

  const supabase = createServiceClient();
  const { data: maxRow } = await supabase
    .from("junior_settings")
    .select("position")
    .eq("book_id", book.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (maxRow?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("junior_settings")
    .insert({
      book_id: book.id,
      description,
      name: result.name,
      epithet: result.epithet,
      image_data: result.imageData,
      position,
    })
    .select("id, description, name, epithet, image_data, position, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "persist_failed", detail: error?.message },
      { status: 500 },
    );
  }
  return NextResponse.json({
    setting: data,
    generationTimeS: result.generationTimeS,
  });
}
