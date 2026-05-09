import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";

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
};

// Renders an MP4 of the storybook to /tmp and returns the file path.
// Caller is responsible for serving + cleaning up the file.
export async function renderStorybook(
  input: RenderStorybookInput,
): Promise<{ path: string; durationS: number }> {
  const serveUrl = await getBundleUrl();
  const composition = await selectComposition({
    serveUrl,
    id: "Storybook",
    inputProps: input,
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
    inputProps: input,
    chromiumOptions: {
      // Run in headless mode without GPU on linux self-host.
      headless: true,
    },
  });
  const durationS = (Date.now() - t0) / 1000;

  return { path: outPath, durationS };
}
