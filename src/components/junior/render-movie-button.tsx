"use client";

import { useRef, useState } from "react";
import type { JuniorScene } from "./workspace";

const FRAME_W = 1080;
const FRAME_H = 1080;
const SECONDS_PER_SCENE = 5;
const FPS = 30;

// Phase-1 client-side film renderer. Draws each scene as 5s on a canvas with
// title cards, captures via MediaRecorder, downloads webm.
// Phase-2 (future) replaces this with server-side Remotion for higher quality
// + voiceover synthesis. For now this MVP is enough for parents/kids to share.
export function RenderMovieButton({
  title,
  scenes,
}: {
  title: string;
  scenes: JuniorScene[];
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  async function loadImage(b64: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("img_load_failed"));
      img.src = `data:image/png;base64,${b64}`;
    });
  }

  function drawFrame(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement | null,
    name: string | null,
    epithet: string | null,
    fadeIn: number, // 0..1
    fadeOut: number, // 0..1
  ) {
    // Parchment background.
    ctx.fillStyle = "#f6efe2";
    ctx.fillRect(0, 0, FRAME_W, FRAME_H);

    if (img) {
      ctx.save();
      ctx.globalAlpha = Math.min(fadeIn, fadeOut);
      const pad = 80;
      const w = FRAME_W - pad * 2;
      const h = w; // square
      const y = 100;
      ctx.drawImage(img, pad, y, w, h);
      // Frame border.
      ctx.strokeStyle = "#1d1916";
      ctx.lineWidth = 4;
      ctx.strokeRect(pad, y, w, h);
      ctx.restore();
    }

    // Title card area
    ctx.save();
    ctx.globalAlpha = Math.min(fadeIn, fadeOut);
    ctx.fillStyle = "#1d1916";
    ctx.font = "bold 56px serif";
    ctx.textAlign = "center";
    if (name) ctx.fillText(name, FRAME_W / 2, FRAME_H - 110);
    if (epithet) {
      ctx.fillStyle = "#0e544c";
      ctx.font = "italic 32px serif";
      ctx.fillText(epithet, FRAME_W / 2, FRAME_H - 60);
    }
    ctx.restore();
  }

  function drawCover(ctx: CanvasRenderingContext2D, t: string, fadeIn: number) {
    ctx.fillStyle = "#f6efe2";
    ctx.fillRect(0, 0, FRAME_W, FRAME_H);
    ctx.save();
    ctx.globalAlpha = fadeIn;
    ctx.fillStyle = "#1d1916";
    ctx.font = "bold 80px serif";
    ctx.textAlign = "center";
    const lines = wrap(ctx, t, FRAME_W - 200);
    const startY = FRAME_H / 2 - (lines.length - 1) * 50;
    lines.forEach((l, i) => ctx.fillText(l, FRAME_W / 2, startY + i * 100));
    ctx.fillStyle = "#847a6a";
    ctx.font = "italic 32px serif";
    ctx.fillText("Andaime Junior", FRAME_W / 2, FRAME_H - 80);
    ctx.restore();
  }

  function wrap(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
  ): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  async function record() {
    cancelledRef.current = false;
    setBusy(true);
    setProgress(0);
    setError(null);

    try {
      // Pre-load all images first to avoid drift during recording.
      const ordered = [...scenes].sort((a, b) => a.position - b.position);
      const images: (HTMLImageElement | null)[] = [];
      for (let i = 0; i < ordered.length; i++) {
        const s = ordered[i];
        if (s.image_data) {
          try {
            images.push(await loadImage(s.image_data));
          } catch {
            images.push(null);
          }
        } else {
          images.push(null);
        }
        if (cancelledRef.current) throw new Error("cancelled");
        setProgress(((i + 1) / (ordered.length + 1)) * 0.3); // 30% pra preload
      }

      const canvas = document.createElement("canvas");
      canvas.width = FRAME_W;
      canvas.height = FRAME_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no_canvas_ctx");

      const stream = canvas.captureStream(FPS);
      const chunks: Blob[] = [];
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const rec = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 2_500_000,
      });
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recDone = new Promise<Blob>((resolve) => {
        rec.onstop = () => resolve(new Blob(chunks, { type: mime }));
      });

      rec.start();

      const totalScenes = ordered.length;
      const totalSeconds = (totalScenes + 1) * SECONDS_PER_SCENE; // +1 cover

      // Cover for SECONDS_PER_SCENE seconds.
      const coverStart = performance.now();
      while (performance.now() - coverStart < SECONDS_PER_SCENE * 1000) {
        if (cancelledRef.current) break;
        const elapsed = (performance.now() - coverStart) / 1000;
        const fadeIn = Math.min(1, elapsed / 0.6);
        drawCover(ctx, title || "Sem título", fadeIn);
        setProgress(0.3 + (elapsed / totalSeconds) * 0.7);
        await new Promise((r) => setTimeout(r, 1000 / FPS));
      }

      // Each scene 5s with 0.4s fade in/out.
      for (let i = 0; i < totalScenes; i++) {
        if (cancelledRef.current) break;
        const s = ordered[i];
        const img = images[i];
        const start = performance.now();
        while (performance.now() - start < SECONDS_PER_SCENE * 1000) {
          if (cancelledRef.current) break;
          const elapsed = (performance.now() - start) / 1000;
          const fadeIn = Math.min(1, elapsed / 0.5);
          const fadeOut = Math.min(
            1,
            (SECONDS_PER_SCENE - elapsed) / 0.5,
          );
          drawFrame(ctx, img, s.name, s.epithet, fadeIn, fadeOut);
          const overall =
            (SECONDS_PER_SCENE * (i + 1) + elapsed) / totalSeconds;
          setProgress(0.3 + overall * 0.7);
          await new Promise((r) => setTimeout(r, 1000 / FPS));
        }
      }

      rec.stop();
      const blob = await recDone;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safe =
        (title || "filme")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 60) || "filme";
      a.href = url;
      a.download = `${safe}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setProgress(1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg !== "cancelled") setError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (scenes.length === 0) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={busy ? () => (cancelledRef.current = true) : record}
        className="body-serif text-[0.92rem] tracking-[0.02em] px-5 py-2 rounded-full transition-all hover:translate-y-[-1px]"
        style={{
          background: busy ? "var(--paper)" : "var(--magic)",
          color: busy ? "var(--ink)" : "var(--paper)",
          border: busy ? "1px solid var(--paper-edge)" : "none",
        }}
      >
        {busy
          ? `gravando... ${Math.round(progress * 100)}% (clique p/ cancelar)`
          : "🎬 baixar como filme (.webm)"}
      </button>
      {error && (
        <p className="body-serif italic text-[0.82rem] text-[var(--crimson)]">
          {error}
        </p>
      )}
    </div>
  );
}
