import { NextResponse } from "next/server";
import { resolveBookOrError } from "@/lib/junior/book";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const bookOrErr = await resolveBookOrError(req);
  if (bookOrErr instanceof NextResponse) return bookOrErr;
  const book = bookOrErr;
  const supabase = createServiceClient();

  const [
    { data: characters },
    { data: settings },
    { data: objects },
    { data: scenes },
  ] = await Promise.all([
    supabase
      .from("junior_characters")
      .select("id, description, name, epithet, image_data, position, created_at")
      .eq("book_id", book.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("junior_settings")
      .select("id, description, name, epithet, image_data, position, created_at")
      .eq("book_id", book.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("junior_objects")
      .select("id, description, name, epithet, image_data, position, created_at")
      .eq("book_id", book.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("junior_scenes")
      .select(
        "id, setting_id, description, name, epithet, image_data, position, created_at, junior_scene_characters(character_id), junior_scene_objects(object_id)",
      )
      .eq("book_id", book.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  type SceneRow = {
    id: string;
    setting_id: string | null;
    description: string;
    name: string | null;
    epithet: string | null;
    image_data: string | null;
    position: number;
    created_at: string;
    junior_scene_characters?: { character_id: string }[];
    junior_scene_objects?: { object_id: string }[];
  };

  const flattenedScenes = ((scenes ?? []) as SceneRow[]).map((s) => ({
    id: s.id,
    setting_id: s.setting_id,
    description: s.description,
    name: s.name,
    epithet: s.epithet,
    image_data: s.image_data,
    position: s.position,
    created_at: s.created_at,
    character_ids: (s.junior_scene_characters ?? []).map((j) => j.character_id),
    object_ids: (s.junior_scene_objects ?? []).map((j) => j.object_id),
  }));

  return NextResponse.json({
    book: {
      id: book.id,
      title: book.title,
      createdAt: book.created_at,
      lessonType: book.lesson_type,
      publishedAt: book.published_at,
      publishedTitle: book.published_title,
      publishedScope: book.published_scope,
      attemptId: book.attempt_id,
    },
    characters: characters ?? [],
    settings: settings ?? [],
    objects: objects ?? [],
    scenes: flattenedScenes,
  });
}
