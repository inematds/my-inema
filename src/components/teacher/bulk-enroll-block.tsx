"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ResultRow = {
  username: string;
  password?: string;
  status: "created" | "existing" | "enrolled" | "skipped" | "error";
  detail?: string;
};

// Bulk enroll: teacher pastes usernames (one per line, or CSV-style),
// system creates accounts and enrolls them. Returns generated passwords
// so teacher can hand them out.
export function BulkEnrollBlock({ classId }: { classId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function parseUsernames(raw: string): string[] {
    // Split on newlines OR commas. Trim and dedupe.
    const set = new Set<string>();
    for (const part of raw.split(/[\n,]+/)) {
      const t = part.trim();
      if (t.length > 0) set.add(t);
    }
    return Array.from(set);
  }

  async function submit() {
    const usernames = parseUsernames(text);
    if (usernames.length === 0) {
      setError("Cole pelo menos um usuário.");
      return;
    }
    if (usernames.length > 60) {
      setError("Máximo 60 por vez.");
      return;
    }
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const r = await fetch(`/api/class/${classId}/bulk-enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ usernames }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? "Falha.");
        return;
      }
      setResults(j.results as ResultRow[]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="body-serif italic text-[0.85rem] px-3 py-1 rounded-full transition-all hover:translate-y-[-1px] self-start"
        style={{
          background: "transparent",
          border: "1px solid var(--paper-edge)",
          color: "var(--ink-soft)",
        }}
      >
        + cadastrar vários alunos de uma vez
      </button>
    );
  }

  return (
    <div
      className="rounded-[14px] border-2 p-4 flex flex-col gap-3"
      style={{
        background: "var(--paper)",
        borderColor: "var(--paper-edge)",
      }}
    >
      <p className="body-serif italic text-[0.78rem] tracking-wide text-[var(--ink-faint)]">
        cadastrar alunos em lote
      </p>
      <p className="body-serif text-[0.88rem] text-[var(--ink-soft)]">
        Cole uma lista de usuários (um por linha, ou separados por vírgula).
        Vamos criar contas e enrolar todos. Você recebe a senha de cada um pra
        passar pra eles.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        disabled={busy}
        placeholder={"bruno\nmariana\npedro\nlucas\njulia"}
        className="body-serif text-[0.95rem] text-[var(--ink)] bg-transparent outline-none border border-[var(--paper-edge)] focus:border-[var(--magic)] rounded-[10px] p-3 transition-colors resize-y leading-snug disabled:opacity-60 font-mono"
      />
      {error && (
        <p className="body-serif italic text-[0.9rem] text-[var(--crimson)]">
          {error}
        </p>
      )}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setText("");
            setResults(null);
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
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="body-serif text-[0.92rem] px-5 py-2 rounded-full transition-all hover:translate-y-[-1px] disabled:opacity-40"
          style={{
            background: "var(--magic)",
            color: "var(--paper)",
          }}
        >
          {busy ? "cadastrando..." : "cadastrar todos"}
        </button>
      </div>

      {results && (
        <div className="mt-2 flex flex-col gap-1">
          <p className="body-serif italic text-[0.78rem] tracking-wide text-[var(--ink-faint)]">
            resultado — anota as senhas pra entregar pros alunos:
          </p>
          <table className="text-[0.85rem] body-serif w-full">
            <thead>
              <tr style={{ color: "var(--ink-faint)" }}>
                <th className="text-left font-normal italic pb-1">usuário</th>
                <th className="text-left font-normal italic pb-1">senha</th>
                <th className="text-left font-normal italic pb-1">status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td className="display tracking-tight pr-3 py-1">
                    {r.username}
                  </td>
                  <td className="font-mono pr-3 py-1">
                    {r.password ? (
                      <code style={{ background: "var(--paper-deep)" }} className="px-1.5 py-0.5 rounded">
                        {r.password}
                      </code>
                    ) : (
                      <span className="italic text-[var(--ink-faint)]">—</span>
                    )}
                  </td>
                  <td
                    className="italic py-1"
                    style={{
                      color:
                        r.status === "error"
                          ? "var(--crimson)"
                          : r.status === "skipped"
                            ? "var(--ink-faint)"
                            : "var(--magic)",
                    }}
                  >
                    {r.status}
                    {r.detail ? ` · ${r.detail}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
