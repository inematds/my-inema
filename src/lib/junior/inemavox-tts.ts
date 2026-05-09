// Client for inemavox TTS service. Async job model:
//   POST /api/jobs/tts {text, engine, lang, voice?} → { id }
//   GET  /api/jobs/{id} → poll status
//   GET  /api/jobs/{id}/audio → mp3 bytes
//
// inemavox roda em http://localhost:8010 por default.

const INEMAVOX_URL = process.env.INEMAVOX_URL || "http://localhost:8010";

const POLL_INTERVAL_MS = 1500;
const MAX_WAIT_MS = 90_000;

export type TtsOptions = {
  text: string;
  // edge é instantâneo (Microsoft); chatterbox usa modelo local mais lento.
  engine?: "edge" | "chatterbox";
  lang?: string;
  // voice depende do engine. Pra edge em pt-BR, ex: "pt-BR-FranciscaNeural".
  voice?: string;
};

export async function generateTts(opts: TtsOptions): Promise<Buffer> {
  const { text, engine = "edge", lang = "pt", voice } = opts;
  if (!text || text.trim().length === 0) {
    throw new Error("tts: empty text");
  }

  const create = await fetch(`${INEMAVOX_URL}/api/jobs/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, engine, lang, ...(voice ? { voice } : {}) }),
  });
  if (!create.ok) {
    throw new Error(`tts create: HTTP ${create.status}`);
  }
  const job = (await create.json()) as { id: string };
  if (!job.id) throw new Error("tts: no job id");

  const start = Date.now();
  while (true) {
    if (Date.now() - start > MAX_WAIT_MS) {
      throw new Error(`tts: timeout after ${MAX_WAIT_MS}ms`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const r = await fetch(`${INEMAVOX_URL}/api/jobs/${job.id}`);
    if (!r.ok) continue;
    const j = (await r.json()) as { status: string; error?: string };
    if (j.status === "completed") break;
    if (j.status === "failed") {
      throw new Error(`tts: job failed: ${j.error ?? "unknown"}`);
    }
  }

  const audio = await fetch(`${INEMAVOX_URL}/api/jobs/${job.id}/audio`);
  if (!audio.ok) throw new Error(`tts download: HTTP ${audio.status}`);
  return Buffer.from(await audio.arrayBuffer());
}

// Helper: build a kid-friendly narration from a scene's metadata.
export function narrationFor(scene: {
  name: string | null;
  epithet: string | null;
}): string {
  const name = scene.name?.trim() ?? "";
  const epithet = scene.epithet?.trim() ?? "";
  if (name && epithet) return `${name}. ${epithet}.`;
  if (name) return `${name}.`;
  if (epithet) return epithet;
  return "Próxima cena.";
}
