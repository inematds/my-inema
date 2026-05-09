"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Teacher leaves a short comment on the kid's book. Single comment per
// attempt; PUT upserts, DELETE clears.
export function FeedbackBlock({
  attemptId,
  initialBody,
}: {
  attemptId: string;
  initialBody: string | null;
}) {
  const router = useRouter();
  const [body, setBody] = useState(initialBody ?? "");
  const [editing, setEditing] = useState(initialBody === null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (body.trim().length === 0) return;
    setBusy(true);
    setError(null);
    const r = await fetch(`/api/attempt/${attemptId}/feedback`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ body: body.trim() }),
    });
    setBusy(false);
    if (!r.ok) {
      setError("Não consegui salvar.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function clear() {
    if (!window.confirm("Apagar seu comentário?")) return;
    setBusy(true);
    const r = await fetch(`/api/attempt/${attemptId}/feedback`, {
      method: "DELETE",
      credentials: "include",
    });
    setBusy(false);
    if (!r.ok) {
      setError("Não consegui apagar.");
      return;
    }
    setBody("");
    setEditing(true);
    router.refresh();
  }

  if (!editing && body) {
    return (
      <div
        className="paper-card rounded-[18px] p-5 flex flex-col gap-3"
      >
        <p className="body-serif italic text-[0.78rem] tracking-wide text-[var(--ink-faint)]">
          seu comentário pra esse aluno
        </p>
        <p className="body-serif text-[1rem] text-[var(--ink)] leading-snug whitespace-pre-wrap">
          {body}
        </p>
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="body-serif italic text-[0.85rem] px-3 py-1 rounded-full"
            style={{
              background: "transparent",
              border: "1px solid var(--paper-edge)",
              color: "var(--ink-soft)",
            }}
          >
            editar
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={busy}
            className="body-serif italic text-[0.85rem] px-3 py-1 rounded-full disabled:opacity-50"
            style={{
              background: "transparent",
              border: "1px solid var(--paper-edge)",
              color: "var(--crimson)",
            }}
          >
            apagar
          </button>
        </div>
        {error && (
          <p className="body-serif italic text-[0.85rem] text-[var(--crimson)]">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="paper-card rounded-[18px] p-5 flex flex-col gap-3">
      <p className="body-serif italic text-[0.78rem] tracking-wide text-[var(--ink-faint)]">
        deixar comentário pra esse aluno
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={2000}
        disabled={busy}
        placeholder="ex: Adorei o personagem da Maya. Que tal mais uma cena mostrando o que ela descobriu?"
        className="body-serif text-[1rem] text-[var(--ink)] bg-transparent outline-none border border-[var(--paper-edge)] focus:border-[var(--magic)] rounded-[10px] p-3 transition-colors resize-y leading-snug disabled:opacity-60"
      />
      {error && (
        <p
          role="alert"
          className="body-serif italic text-[0.9rem] text-[var(--crimson)]"
        >
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {initialBody !== null && (
          <button
            type="button"
            onClick={() => {
              setBody(initialBody ?? "");
              setEditing(false);
              setError(null);
            }}
            disabled={busy}
            className="body-serif italic text-[0.85rem] px-3 py-1 rounded-full disabled:opacity-50"
            style={{
              background: "transparent",
              border: "1px solid var(--paper-edge)",
              color: "var(--ink-soft)",
            }}
          >
            cancelar
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={busy || body.trim().length === 0}
          className="body-serif text-[0.92rem] px-5 py-2 rounded-full transition-all hover:translate-y-[-1px] disabled:opacity-40"
          style={{
            background: "var(--magic)",
            color: "var(--paper)",
            boxShadow: "0 8px 20px -10px rgba(14,84,76,0.5)",
          }}
        >
          {busy ? "salvando..." : "salvar comentário"}
        </button>
      </div>
    </div>
  );
}
