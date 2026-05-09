"use client";

import { useEffect, useRef, useState } from "react";

type Turn = {
  id: string;
  author: string;
  kind: string;
  content: string;
  created_at: string;
};

// Math attempt UI: shows the problem, lets the student type final answer +
// step-by-step work, sends to /api/math/answer, displays AI feedback.
// Mirror principle: AI nudges, never solves for the kid.
export function MathWorkspace({
  assignmentId,
  attemptId: initialAttemptId,
  problem,
  initialTurns,
}: {
  assignmentId: string;
  attemptId: string | null;
  problem: string;
  initialTurns: Turn[];
}) {
  const [attemptId, setAttemptId] = useState<string | null>(initialAttemptId);
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [answer, setAnswer] = useState("");
  const [work, setWork] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length]);

  async function ensureAttempt(): Promise<string | null> {
    if (attemptId) return attemptId;
    const r = await fetch("/api/attempt/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ assignmentId, initial: "" }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setError(j.error ?? "Falha ao iniciar.");
      return null;
    }
    const j = await r.json();
    setAttemptId(j.attemptId);
    return j.attemptId;
  }

  async function submit() {
    if (busy) return;
    if (answer.trim().length === 0 || work.trim().length < 20) {
      setError("Escreva sua resposta E o raciocínio (pelo menos 20 letras).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const aid = await ensureAttempt();
      if (!aid) return;
      const r = await fetch("/api/math/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          attemptId: aid,
          answer: answer.trim(),
          workShown: work.trim(),
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? "Falha ao enviar.");
        return;
      }
      // Append both turns optimistically so the student sees them now.
      const now = new Date().toISOString();
      setTurns((t) => [
        ...t,
        {
          id: `optim-${Date.now()}-s`,
          author: "student",
          kind: "final",
          content: JSON.stringify({ answer: answer.trim(), work: work.trim() }),
          created_at: now,
        },
        {
          id: `optim-${Date.now()}-a`,
          author: "ai",
          kind: "feedback",
          content: JSON.stringify({
            feedback: j.feedback,
            next_step: j.next_step,
            correct: j.correct,
          }),
          created_at: now,
        },
      ]);
      if (j.correct) {
        setAnswer("");
        setWork("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const lastFeedback = (() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      const t = turns[i];
      if (t.author === "ai" && t.kind === "feedback") return t;
    }
    return null;
  })();
  const lastFeedbackParsed = lastFeedback
    ? safeParse<{ feedback: string; next_step: string; correct: boolean }>(lastFeedback.content)
    : null;
  const hasCorrect = !!lastFeedbackParsed?.correct;

  return (
    <div className="max-w-[780px] mx-auto px-6 lg:px-10 pb-16 pt-2 flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="body-serif italic text-[0.85rem] tracking-wide text-[var(--ink-faint)]">
          aula de matemática · Manim
        </p>
        <h1 className="display text-[clamp(1.6rem,3vw,2.4rem)] tracking-tight leading-[1.05]">
          O problema
        </h1>
        <div className="paper-card rounded-[14px] p-5">
          <p className="body-serif text-[1.05rem] text-[var(--ink)] leading-snug whitespace-pre-wrap">
            {problem}
          </p>
        </div>
      </header>

      {/* Turn history */}
      {turns.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="body-serif italic text-[0.78rem] tracking-wide text-[var(--ink-faint)]">
            histórico
          </p>
          <ol className="flex flex-col gap-3">
            {turns.map((t) => {
              const parsed = safeParse(t.content) as Record<string, unknown> | null;
              const isStudent = t.author === "student";
              if (isStudent) {
                const a = parsed?.answer as string | undefined;
                const w = parsed?.work as string | undefined;
                return (
                  <li
                    key={t.id}
                    className="rounded-[12px] p-4 self-end max-w-[80%]"
                    style={{
                      background: "var(--paper-deep)",
                      border: "1px solid var(--paper-edge)",
                    }}
                  >
                    <p className="body-serif italic text-[0.72rem] text-[var(--ink-faint)] mb-1">
                      sua resposta
                    </p>
                    <p className="display tracking-tight text-[1rem] text-[var(--ink)]">
                      {a ?? t.content}
                    </p>
                    {w && (
                      <p className="body-serif text-[0.9rem] text-[var(--ink-soft)] whitespace-pre-wrap mt-2">
                        {w}
                      </p>
                    )}
                  </li>
                );
              }
              const fb = parsed?.feedback as string | undefined;
              const ns = parsed?.next_step as string | undefined;
              const ok = parsed?.correct as boolean | undefined;
              return (
                <li
                  key={t.id}
                  className="rounded-[12px] p-4 self-start max-w-[80%]"
                  style={{
                    background: ok ? "rgba(14,84,76,0.08)" : "var(--paper)",
                    border: `1px solid ${ok ? "var(--magic)" : "var(--paper-edge)"}`,
                  }}
                >
                  <p className="body-serif italic text-[0.72rem] text-[var(--ink-faint)] mb-1">
                    {ok ? "✓ Acertou" : "tutor"}
                  </p>
                  {fb && (
                    <p className="body-serif text-[0.95rem] text-[var(--ink)] leading-snug whitespace-pre-wrap">
                      {fb}
                    </p>
                  )}
                  {ns && (
                    <p className="display-italic text-[0.92rem] text-[var(--magic)] mt-2">
                      {ns}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
          <div ref={endRef} />
        </section>
      )}

      {/* Submission form */}
      {hasCorrect ? (
        <div
          className="paper-card rounded-[18px] p-5 text-center"
          style={{ borderColor: "var(--magic)" }}
        >
          <p className="display-italic text-[1.1rem] text-[var(--magic)]">
            entrega aceita
          </p>
          <p className="body-serif italic text-[0.9rem] text-[var(--ink-faint)] mt-1">
            seu trabalho ficou registrado pro professor.
          </p>
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          <p className="body-serif italic text-[0.78rem] tracking-wide text-[var(--ink-faint)]">
            sua tentativa
          </p>
          <div className="paper-card rounded-[14px] p-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="body-serif italic text-[0.78rem] text-[var(--ink-faint)]">
                resposta final
              </label>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="ex: 42, 3/4, x = 5..."
                disabled={busy}
                className="body-serif text-[1.1rem] text-[var(--ink)] bg-transparent outline-none border-b border-[var(--paper-edge)] focus:border-[var(--magic)] py-2 transition-colors disabled:opacity-60"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="body-serif italic text-[0.78rem] text-[var(--ink-faint)]">
                como você chegou nessa resposta?
              </label>
              <textarea
                value={work}
                onChange={(e) => setWork(e.target.value)}
                rows={6}
                disabled={busy}
                placeholder="escreva seu raciocínio passo-a-passo. quanto mais detalhe, melhor o feedback."
                className="body-serif text-[0.98rem] text-[var(--ink)] bg-transparent outline-none border border-[var(--paper-edge)] focus:border-[var(--magic)] rounded-[10px] p-3 transition-colors resize-y leading-snug disabled:opacity-60"
              />
            </div>
          </div>
          {error && (
            <p
              role="alert"
              className="body-serif italic text-[0.92rem] text-[var(--crimson)]"
            >
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="body-serif text-[0.95rem] tracking-[0.02em] px-6 py-2.5 rounded-full transition-all hover:translate-y-[-1px] disabled:opacity-50 self-start"
            style={{
              background: "var(--magic)",
              color: "var(--paper)",
              boxShadow: "0 8px 20px -10px rgba(14,84,76,0.5)",
            }}
          >
            {busy ? "verificando..." : "enviar tentativa"}
          </button>
        </section>
      )}
    </div>
  );
}

function safeParse<T = unknown>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}
