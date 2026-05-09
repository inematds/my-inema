import { generateCaption, type Caption, type CaptionKind } from "./caption";

const INEMAIMG_URL = process.env.INEMAIMG_URL || "http://localhost:8000";

const NO_TEXT_RIDER =
  "Absolutely no text, no letters, no words, no labels, no signs, no writing of any kind anywhere in the image.";

const PROMPTS: Record<CaptionKind, (desc: string) => string> = {
  character: (desc) =>
    `Children's storybook illustration, gentle watercolor and ink, full character portrait facing the viewer, expressive face, soft warm lighting on a cream parchment background, in the style of a beautifully illustrated middle-grade book for ages 8-12. Wholesome and kid-friendly. ${NO_TEXT_RIDER} Character: ${desc}`,
  setting: (desc) =>
    `Children's storybook illustration, gentle watercolor and ink, wide establishing scene of a place — no people in frame, focus on the environment itself. Soft warm lighting on a cream parchment background, in the style of a beautifully illustrated middle-grade book for ages 8-12. Wholesome and kid-friendly. ${NO_TEXT_RIDER} Place: ${desc}`,
  scene: (desc) =>
    `Children's storybook illustration, gentle watercolor and ink, narrative scene combining the provided reference characters inside the provided reference setting, faithful to the references for character likeness and place mood. Cinematic mid-shot composition, soft warm lighting on a cream parchment background, in the style of a beautifully illustrated middle-grade book for ages 8-12. Wholesome and kid-friendly. ${NO_TEXT_RIDER} What is happening: ${desc}`,
  object: (desc) =>
    `Children's storybook illustration, gentle watercolor and ink, single object portrait centered on a cream parchment background — no people, no hands, no environment, only the object itself in clear focus with a soft cast shadow. Soft warm lighting, in the style of a beautifully illustrated middle-grade book for ages 8-12. Wholesome and kid-friendly. ${NO_TEXT_RIDER} Object: ${desc}`,
};

export type IllustrationResult = {
  imageData: string; // base64 PNG, no data: prefix
  generationTimeS: number | null;
  name: string | null;
  epithet: string | null;
};

export type IllustrateError =
  | { kind: "model_not_ready"; loading: string | null }
  | { kind: "image_server_unreachable" }
  | { kind: "timeout" }
  | { kind: "image_failed"; status?: number; detail?: string };

export type IllustrateOutcome =
  | { ok: true; result: IllustrationResult }
  | { ok: false; error: IllustrateError };

export type IllustrateOptions = {
  /** Up to 4 base64-encoded PNG references (flux2-klein cap). */
  referenceImages?: string[];
  seed?: number;
};

export async function illustrate(
  kind: CaptionKind,
  description: string,
  options: IllustrateOptions = {},
): Promise<IllustrateOutcome> {
  const { referenceImages, seed } = options;
  // Pre-flight: surface friendly errors instead of 90s timeout when inemaimg
  // is between models or down.
  try {
    const h = await fetch(`${INEMAIMG_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    }).then(
      (r) =>
        r.json() as Promise<{
          loaded_model: string | null;
          loading_model: string | null;
        }>,
    );
    if (!h.loaded_model || h.loading_model) {
      return { ok: false, error: { kind: "model_not_ready", loading: h.loading_model } };
    }
  } catch {
    return { ok: false, error: { kind: "image_server_unreachable" } };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90_000);

  const refs = (referenceImages ?? []).filter((s) => typeof s === "string" && s.length > 0).slice(0, 4);

  const imagePromise = (async () => {
    const r = await fetch(`${INEMAIMG_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "flux2-klein",
        prompt: PROMPTS[kind](description),
        width: 512,
        height: 512,
        seed: seed ?? Math.floor(Math.random() * 9_999_999),
        steps: 4,
        guidance_scale: 1.0,
        ...(refs.length > 0 ? { images: refs } : {}),
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      throw new Error(`image_http_${r.status}:${detail.slice(0, 200)}`);
    }
    const data = (await r.json()) as { image?: string; generation_time_s?: number };
    if (!data.image) throw new Error("no_image_returned");
    return data;
  })();

  const captionPromise: Promise<Caption> = generateCaption(kind, description).catch(() => ({
    name: null,
    epithet: null,
  }));

  try {
    const [data, caption] = await Promise.all([imagePromise, captionPromise]);
    return {
      ok: true,
      result: {
        imageData: data.image!,
        generationTimeS: data.generation_time_s ?? null,
        name: caption.name,
        epithet: caption.epithet,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const aborted = msg.includes("aborted") || msg.includes("AbortError");
    return {
      ok: false,
      error: aborted
        ? { kind: "timeout" }
        : { kind: "image_failed", detail: msg },
    };
  } finally {
    clearTimeout(timer);
  }
}
