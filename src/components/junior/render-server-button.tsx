"use client";

import { useEffect, useRef, useState } from "react";

// Server-side Remotion render: requests /api/junior/render?bookId=...
// Streams MP4 back. Long-running (~30-90s per scene); we show indeterminate
// progress + elapsed time so user knows it's alive.
export function RenderServerButton({ bookId, title }: { bookId: string; title: string }) {
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(
    () => () => {
      if (tickRef.current) clearInterval(tickRef.current);
    },
    [],
  );

  async function render() {
    setBusy(true);
    setError(null);
    setElapsed(0);
    const start = Date.now();
    tickRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    try {
      const r = await fetch(`/api/junior/render?bookId=${encodeURIComponent(bookId)}`);
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error ?? `HTTP ${r.status}`);
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const safe =
        (title || "livro")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 60) || "livro";
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safe}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (tickRef.current) clearInterval(tickRef.current);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={render}
        disabled={busy}
        className="body-serif text-[0.92rem] tracking-[0.02em] px-5 py-2 rounded-full transition-all hover:translate-y-[-1px] disabled:opacity-60"
        style={{
          background: "var(--ink)",
          color: "var(--paper)",
        }}
      >
        {busy
          ? `🎞️ renderizando MP4 · ${elapsed}s...`
          : "🎞️ alta qualidade (.mp4)"}
      </button>
      {error && (
        <p className="body-serif italic text-[0.82rem] text-[var(--crimson)]">
          {error}
        </p>
      )}
      {busy && (
        <p className="body-serif italic text-[0.78rem] text-[var(--ink-faint)] max-w-[300px] text-right leading-snug">
          o servidor está montando frame por frame com o Remotion. costuma
          levar de 30s a 5min dependendo do número de cenas.
        </p>
      )}
    </div>
  );
}
