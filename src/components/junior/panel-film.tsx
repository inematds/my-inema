"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { JuniorScene } from "./workspace";

const FRAME_MS = 6000; // ~6s por cena no autoplay

export function PanelFilm({
  scenes,
  publishedAt = null,
  publishedTitle = null,
  onPublicationChange,
  readOnly = false,
}: {
  scenes: JuniorScene[];
  publishedAt?: string | null;
  publishedTitle?: string | null;
  onPublicationChange?: (p: {
    publishedAt: string | null;
    publishedTitle: string | null;
  }) => void;
  readOnly?: boolean;
}) {
  const ordered = useMemo(
    () => [...scenes].sort((a, b) => a.position - b.position),
    [scenes],
  );

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 within current frame
  const startTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Clamp idx if scenes shrink.
  useEffect(() => {
    if (idx >= ordered.length && ordered.length > 0) {
      setIdx(ordered.length - 1);
    }
  }, [ordered.length, idx]);

  // Autoplay loop (RAF for smooth progress bar + scene advance).
  useEffect(() => {
    if (!playing || ordered.length === 0) {
      startTsRef.current = null;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      return;
    }
    function tick(ts: number) {
      if (startTsRef.current == null) startTsRef.current = ts;
      const elapsed = ts - startTsRef.current;
      const p = Math.min(1, elapsed / FRAME_MS);
      setProgress(p);
      if (p >= 1) {
        startTsRef.current = ts;
        setIdx((i) => {
          const next = i + 1;
          if (next >= ordered.length) {
            setPlaying(false);
            return i; // stop on last frame
          }
          return next;
        });
        setProgress(0);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, ordered.length]);

  // Reset progress when user manually changes scene.
  function go(next: number) {
    if (next < 0 || next >= ordered.length) return;
    setIdx(next);
    setProgress(0);
    startTsRef.current = null;
  }

  // Keyboard nav.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx]);

  if (ordered.length === 0) {
    return (
      <div className="body-serif italic text-[var(--ink-faint)] py-12 text-center">
        sem cenas ainda. crie a primeira no Ato 4 — o livro se monta sozinho.
      </div>
    );
  }

  const current = ordered[idx];
  const imageSrc = current.image_data
    ? `data:image/png;base64,${current.image_data}`
    : null;
  const isLast = idx === ordered.length - 1;

  return (
    <section className="flex flex-col gap-6 items-center">
      <div className="w-full flex items-baseline justify-between max-w-[860px]">
        <p className="body-serif italic text-[0.85rem] tracking-wide text-[var(--ink-faint)]">
          ato 5 · livro
        </p>
        <p className="body-serif tabular-nums text-[0.85rem] text-[var(--ink-faint)]">
          cena {idx + 1} <span className="opacity-50">/ {ordered.length}</span>
        </p>
      </div>

      {/* Stage */}
      <div
        className="relative w-full max-w-[860px] aspect-square rounded-[6px] overflow-hidden"
        style={{
          background: "var(--paper)",
          border: "1px solid var(--ink)",
          boxShadow:
            "inset 0 0 0 5px var(--paper), inset 0 0 0 6px var(--ink), 0 30px 60px -30px rgba(29,25,22,0.45)",
        }}
      >
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.id}
            src={imageSrc}
            alt={current.name ?? "cena"}
            className="absolute inset-[24px] w-[calc(100%-48px)] h-[calc(100%-48px)] object-cover rounded-[3px] animate-film-fade"
          />
        ) : (
          <div className="absolute inset-[24px] grid place-items-center body-serif italic text-[var(--ink-faint)]">
            sem imagem
          </div>
        )}
      </div>

      {/* Title card */}
      <div
        key={`title-${current.id}`}
        className="text-center max-w-[640px] animate-film-fade"
      >
        {current.name ? (
          <>
            <h3 className="display text-[clamp(1.6rem,3.2vw,2.4rem)] leading-[1.05] text-[var(--ink)]">
              {current.name}
            </h3>
            {current.epithet && (
              <p className="display-italic text-[1.05rem] text-[var(--magic)] mt-2 leading-tight">
                {current.epithet}
              </p>
            )}
          </>
        ) : (
          <h3 className="display-italic text-[1.05rem] text-[var(--ink-faint)]">
            sem título
          </h3>
        )}
      </div>

      {/* Frame progress bar */}
      <div className="w-full max-w-[860px] h-[3px] bg-[var(--paper-edge)]/60 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress * 100}%`,
            background: "var(--magic)",
            transition: playing ? "none" : "width 200ms ease-out",
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => go(idx - 1)}
          disabled={idx === 0}
          aria-label="cena anterior"
          className="body-serif text-[0.92rem] px-4 py-2 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:translate-y-[-1px]"
          style={{
            border: "1px solid var(--paper-edge)",
            background: "var(--paper)",
            color: "var(--ink-soft)",
          }}
        >
          ← anterior
        </button>

        <button
          onClick={() => {
            if (isLast && !playing) {
              go(0);
              setPlaying(true);
            } else {
              setPlaying((p) => !p);
            }
          }}
          aria-label={playing ? "pausar" : "tocar"}
          className="body-serif text-[0.95rem] tracking-[0.02em] px-6 py-2.5 rounded-full transition-all hover:translate-y-[-1px] active:translate-y-0"
          style={{
            background: "var(--ink)",
            color: "var(--paper)",
            boxShadow: "0 8px 20px -10px rgba(29,25,22,0.4)",
          }}
        >
          {playing ? "pausar" : isLast ? "tocar de novo" : "tocar o livro"}
        </button>

        <button
          onClick={() => go(idx + 1)}
          disabled={isLast}
          aria-label="próxima cena"
          className="body-serif text-[0.92rem] px-4 py-2 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:translate-y-[-1px]"
          style={{
            border: "1px solid var(--paper-edge)",
            background: "var(--paper)",
            color: "var(--ink-soft)",
          }}
        >
          próxima →
        </button>
      </div>

      {/* Scene dots */}
      <div className="flex flex-wrap justify-center gap-2 max-w-[860px]">
        {ordered.map((s, i) => (
          <button
            key={s.id}
            onClick={() => go(i)}
            aria-label={`ir para cena ${i + 1}`}
            className="size-2.5 rounded-full transition-all hover:scale-125"
            style={{
              background: i === idx ? "var(--magic)" : "var(--paper-edge)",
              boxShadow:
                i === idx ? "0 0 0 3px rgba(14, 84, 76, 0.15)" : "none",
            }}
          />
        ))}
      </div>

      <p className="body-serif italic text-[0.85rem] text-[var(--ink-faint)] mt-2 text-center max-w-[58ch]">
        dica: setas ← → trocam de cena, espaço pausa e volta.
      </p>

      {!readOnly && onPublicationChange && (
        <PublishBlock
          publishedAt={publishedAt}
          publishedTitle={publishedTitle}
          onChange={onPublicationChange}
          suggestedTitle={ordered[0]?.name ?? "Meu livro"}
        />
      )}
    </section>
  );
}

function PublishBlock({
  publishedAt,
  publishedTitle,
  onChange,
  suggestedTitle,
}: {
  publishedAt: string | null;
  publishedTitle: string | null;
  onChange: (p: { publishedAt: string | null; publishedTitle: string | null }) => void;
  suggestedTitle: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [title, setTitle] = useState(suggestedTitle);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function publish() {
    const t = title.trim();
    if (t.length === 0) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const r = await fetch("/api/junior/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok || !j.publication) {
        setErrorMsg(messageFor(j.error));
        return;
      }
      onChange({
        publishedAt: j.publication.published_at,
        publishedTitle: j.publication.published_title,
      });
      setConfirming(false);
    } catch {
      setErrorMsg("Não consegui publicar. Tenta de novo?");
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    if (!confirm("Tirar do mural?")) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const r = await fetch("/api/junior/publish", {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        setErrorMsg("Não consegui tirar do mural.");
        return;
      }
      onChange({ publishedAt: null, publishedTitle: null });
    } finally {
      setBusy(false);
    }
  }

  if (publishedAt) {
    const when = new Date(publishedAt).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <div
        className="mt-4 w-full max-w-[640px] paper-card rounded-[18px] p-5 text-center flex flex-col items-center gap-3"
        style={{ borderColor: "var(--magic)" }}
      >
        <p className="display-italic text-[1.1rem] text-[var(--magic)] leading-[1.1]">
          publicado no mural
        </p>
        <p className="body-serif text-[0.95rem] text-[var(--ink-soft)] leading-snug">
          como <strong className="display not-italic">{publishedTitle}</strong> · {when}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
          <a
            href="/mural"
            className="body-serif text-[0.92rem] tracking-[0.02em] px-5 py-2 rounded-full transition-all hover:translate-y-[-1px]"
            style={{
              background: "var(--ink)",
              color: "var(--paper)",
              boxShadow: "0 8px 20px -10px rgba(29,25,22,0.4)",
            }}
          >
            ver no mural →
          </a>
          <button
            onClick={unpublish}
            disabled={busy}
            className="body-serif italic text-[0.85rem] px-3 py-1.5 rounded-full text-[var(--ink-faint)] hover:text-[var(--crimson)] transition-colors disabled:opacity-50"
          >
            tirar do mural
          </button>
        </div>
        {errorMsg && (
          <p className="body-serif italic text-[0.9rem] text-[var(--crimson)]">
            {errorMsg}
          </p>
        )}
      </div>
    );
  }

  if (!confirming) {
    return (
      <div className="mt-4 flex flex-col items-center gap-2">
        <button
          onClick={() => setConfirming(true)}
          className="body-serif text-[0.95rem] tracking-[0.02em] px-6 py-2.5 rounded-full transition-all hover:translate-y-[-1px] active:translate-y-0"
          style={{
            background: "var(--magic)",
            color: "var(--paper)",
            boxShadow: "0 8px 20px -10px rgba(14,84,76,0.5)",
          }}
        >
          publicar no mural
        </button>
        <p className="body-serif italic text-[0.82rem] text-[var(--ink-faint)] text-center max-w-[48ch]">
          quem publica entra na parede dos livros — todo mundo vê e pode ler.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 w-full max-w-[640px] paper-card rounded-[18px] p-5 flex flex-col gap-3">
      <p className="body-serif italic text-[0.85rem] tracking-wide text-[var(--ink-faint)] text-center">
        que nome esse livro vai ter no mural?
      </p>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        autoFocus
        disabled={busy}
        placeholder="Meu livro"
        className="body-serif text-[1.05rem] text-center text-[var(--ink)] bg-transparent outline-none border-b-2 border-[var(--paper-edge)] focus:border-[var(--magic)] py-2 transition-colors disabled:opacity-60"
      />
      {errorMsg && (
        <p
          role="alert"
          className="body-serif italic text-[0.9rem] text-[var(--crimson)] text-center"
        >
          {errorMsg}
        </p>
      )}
      <div className="flex justify-center gap-3 mt-1">
        <button
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="body-serif text-[0.92rem] px-4 py-2 rounded-full transition-all hover:translate-y-[-1px] disabled:opacity-50"
          style={{
            border: "1px solid var(--paper-edge)",
            background: "var(--paper)",
            color: "var(--ink-soft)",
          }}
        >
          cancelar
        </button>
        <button
          onClick={publish}
          disabled={busy || title.trim().length === 0}
          className="body-serif text-[0.95rem] tracking-[0.02em] px-6 py-2.5 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:translate-y-[-1px]"
          style={{
            background: "var(--magic)",
            color: "var(--paper)",
            boxShadow: "0 8px 20px -10px rgba(14,84,76,0.5)",
          }}
        >
          {busy ? "publicando..." : "aprovar e publicar"}
        </button>
      </div>
    </div>
  );
}

function messageFor(error: string | undefined): string {
  switch (error) {
    case "no_scenes":
      return "Crie pelo menos uma cena antes de publicar.";
    case "no_book":
      return "Não achei seu livro. Recarrega a página?";
    default:
      return "Não consegui publicar. Tenta de novo?";
  }
}
