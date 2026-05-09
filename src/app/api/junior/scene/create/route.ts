import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveBookOrError } from "@/lib/junior/book";
import { createServiceClient } from "@/lib/supabase/service";
import { illustrate } from "@/lib/junior/illustrate";

export const runtime = "nodejs";
export const maxDuration = 120;

const BodySchema = z.object({
  description: z.string().min(20).max(2000),
  settingId: z.guid().nullable().optional(),
  characterIds: z.array(z.guid()).min(1).max(4),
  objectIds: z.array(z.guid()).max(4).optional(),
  seed: z.number().int().optional(),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { description, settingId, characterIds, objectIds = [], seed } = parsed.data;

  const bookOrErr = await resolveBookOrError(req);
  if (bookOrErr instanceof NextResponse) return bookOrErr;
  const book = bookOrErr;
  const supabase = createServiceClient();

  // Pull image refs for setting + selected characters + objects, scoped to the kid's book.
  // flux2-klein cap is 4 refs total. Setting (if any) takes 1 slot; the rest is shared
  // between characters (priority) and objects.
  const refs: string[] = [];

  if (settingId) {
    const { data: setting } = await supabase
      .from("junior_settings")
      .select("image_data")
      .eq("id", settingId)
      .eq("book_id", book.id)
      .maybeSingle();
    if (!setting) {
      return NextResponse.json({ error: "setting_not_found" }, { status: 404 });
    }
    if (setting.image_data) refs.push(setting.image_data);
  }

  const totalBudget = Math.max(0, 4 - refs.length);
  const usedCharacterIds = characterIds.slice(0, totalBudget);
  if (usedCharacterIds.length === 0) {
    return NextResponse.json({ error: "no_character_slots" }, { status: 400 });
  }
  const objectBudget = Math.max(0, totalBudget - usedCharacterIds.length);
  const usedObjectIds = objectIds.slice(0, objectBudget);

  const { data: characters } = await supabase
    .from("junior_characters")
    .select("id, image_data")
    .in("id", usedCharacterIds)
    .eq("book_id", book.id);
  const charMap = new Map((characters ?? []).map((c) => [c.id, c.image_data]));
  for (const id of usedCharacterIds) {
    const img = charMap.get(id);
    if (!img) {
      return NextResponse.json(
        { error: "character_not_found", id },
        { status: 404 },
      );
    }
    refs.push(img);
  }

  if (usedObjectIds.length > 0) {
    const { data: objects } = await supabase
      .from("junior_objects")
      .select("id, image_data")
      .in("id", usedObjectIds)
      .eq("book_id", book.id);
    const objMap = new Map((objects ?? []).map((o) => [o.id, o.image_data]));
    for (const id of usedObjectIds) {
      const img = objMap.get(id);
      if (!img) {
        return NextResponse.json(
          { error: "object_not_found", id },
          { status: 404 },
        );
      }
      refs.push(img);
    }
  }

  const outcome = await illustrate("scene", description, {
    seed,
    referenceImages: refs,
  });
  if (!outcome.ok) {
    const status =
      outcome.error.kind === "model_not_ready" ||
      outcome.error.kind === "image_server_unreachable"
        ? 503
        : outcome.error.kind === "timeout"
          ? 504
          : 502;
    return NextResponse.json({ error: outcome.error.kind }, { status });
  }
  const result = outcome.result;

  const { data: maxRow } = await supabase
    .from("junior_scenes")
    .select("position")
    .eq("book_id", book.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (maxRow?.position ?? -1) + 1;

  const { data: scene, error } = await supabase
    .from("junior_scenes")
    .insert({
      book_id: book.id,
      setting_id: settingId ?? null,
      description,
      name: result.name,
      epithet: result.epithet,
      image_data: result.imageData,
      position,
    })
    .select("id, setting_id, description, name, epithet, image_data, position, created_at")
    .single();

  if (error || !scene) {
    return NextResponse.json(
      { error: "persist_failed", detail: error?.message },
      { status: 500 },
    );
  }

  if (usedCharacterIds.length > 0) {
    await supabase
      .from("junior_scene_characters")
      .insert(usedCharacterIds.map((cid) => ({ scene_id: scene.id, character_id: cid })));
  }
  if (usedObjectIds.length > 0) {
    await supabase
      .from("junior_scene_objects")
      .insert(usedObjectIds.map((oid) => ({ scene_id: scene.id, object_id: oid })));
  }

  return NextResponse.json({
    scene: {
      ...scene,
      character_ids: usedCharacterIds,
      object_ids: usedObjectIds,
    },
    generationTimeS: result.generationTimeS,
  });
}
