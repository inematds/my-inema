import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { generateTts, narrationFor } from "@/lib/junior/inemavox-tts";

let bundleCache: { url: string; promise: Promise<string> } | null = null;

// Bundle the Remotion entrypoint once per process. Caches in /tmp.
async function getBundleUrl(): Promise<string> {
  if (bundleCache) return bundleCache.promise;
  const entry = path.join(process.cwd(), "src/remotion/entry.ts");
  const promise = bundle({
    entryPoint: entry,
    onProgress: () => {
      /* silent */
    },
  });
  bundleCache = { url: "", promise };
  const url = await promise;
  bundleCache = { url, promise: Promise.resolve(url) };
  return url;
}

export type RenderStorybookInput = {
  title: string;
  scenes: {
    id: string;
    name: string | null;
    epithet: string | null;
    image_data: string | null;
  }[];
  // When true, generate TTS narration per scene via inemavox and embed as
  // base64 audio in the composition. Adds 1-3s per scene to render time.
  withNarration?: boolean;
};

// Renders an MP4 of the storybook to /tmp and returns the file path.
// Caller is responsible for serving + cleaning up the file.
export async function renderStorybook(
  input: RenderStorybookInput,
): Promise<{ path: string; durationS: number; narrationsGenerated: number }> {
  const serveUrl = await getBundleUrl();

  // Optional: generate narration audio per scene in parallel.
  let scenesWithAudio = input.scenes.map((s) => ({ ...s, audio_url: null as string | null }));
  let narrationsGenerated = 0;
  if (input.withNarration) {
    const audios = await Promise.all(
      input.scenes.map(async (s) => {
        try {
          const text = narrationFor(s);
          const buf = await generateTts({ text, engine: "edge", lang: "pt" });
          return `data:audio/mp3;base64,${buf.toString("base64")}`;
        } catch {
          return null;
        }
      }),
    );
    scenesWithAudio = input.scenes.map((s, i) => ({
      ...s,
      audio_url: audios[i],
    }));
    narrationsGenerated = audios.filter(Boolean).length;
  }

  const inputProps = {
    title: input.title,
    scenes: scenesWithAudio,
  };

  const composition = await selectComposition({
    serveUrl,
    id: "Storybook",
    inputProps,
  });

  const outDir = path.join(os.tmpdir(), "andaime-renders");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`);

  const t0 = Date.now();
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outPath,
    inputProps,
    chromiumOptions: {
      headless: true,
    },
  });
  const durationS = (Date.now() - t0) / 1000;

  return { path: outPath, durationS, narrationsGenerated };
}
