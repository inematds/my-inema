"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  author_name: string | null;
  author_role: string | null;
};

// Simple polling-based chat thread for an attempt.
// Both teacher and student see the same view; messages tagged by author role.
export function ChatThread({
  attemptId,
  currentUserId,
}: {
  attemptId: string;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      const r = await fetch(`/api/attempt/${attemptId}/messages`, {
        credentials: "include",
      });
      if (!r.ok) {
        setError(`HTTP ${r.status}`);
        return;
      }
      const j = await r.json();
      setMessages(j.messages ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [attemptId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (text.length === 0) return;
    setSending(true);
    setError(null);
    try {
      const r = await fetch(`/api/attempt/${attemptId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: text }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error ?? "Não consegui enviar.");
        return;
      }
      setBody("");
      await load();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 paper-card rounded-[18px] p-5 max-w-[860px] mx-auto w-full">
      <p className="body-serif italic text-[0.78rem] tracking-wide text-[var(--ink-faint)]">
        conversa sobre esta aula
      </p>

      <div
        className="flex flex-col gap-2 min-h-[120px] max-h-[420px] overflow-y-auto pr-1"
        style={{ scrollbarWidth: "thin" }}
      >
        {loading && messages.length === 0 ? (
          <p className="body-serif italic text-[0.85rem] text-[var(--ink-faint)]">
            carregando...
          </p>
        ) : messages.length === 0 ? (
          <p className="body-serif italic text-[0.85rem] text-[var(--ink-faint)]">
            sem mensagens ainda. comece dizendo oi.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.author_id === currentUserId;
            const teacherSide = m.author_role === "teacher" || m.author_role === "parent";
            return (
              <div
                key={m.id}
                className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
              >
                <div
                  className="max-w-[75%] rounded-[14px] px-3 py-2"
                  style={{
                    background: mine ? "var(--magic)" : "var(--paper-deep)",
                    color: mine ? "var(--paper)" : "var(--ink)",
                    border: mine ? "none" : "1px solid var(--paper-edge)",
                  }}
                >
                  <p className="body-serif text-[0.95rem] leading-snug whitespace-pre-wrap">
                    {m.body}
                  </p>
                </div>
                <p className="body-serif italic text-[0.7rem] text-[var(--ink-faint)] mt-1 px-2">
                  {m.author_name ?? (teacherSide ? "professor" : "aluno")} ·{" "}
                  {new Date(m.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 items-end">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={4000}
          disabled={sending}
          placeholder="escrever..."
          className="body-serif flex-1 text-[0.95rem] text-[var(--ink)] bg-transparent outline-none border border-[var(--paper-edge)] focus:border-[var(--magic)] rounded-[10px] p-2 transition-colors resize-y leading-snug disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={sending || body.trim().length === 0}
          className="body-serif text-[0.9rem] px-4 py-2 rounded-full transition-all hover:translate-y-[-1px] disabled:opacity-40"
          style={{
            background: "var(--magic)",
            color: "var(--paper)",
          }}
        >
          {sending ? "..." : "enviar"}
        </button>
      </form>

      {error && (
        <p className="body-serif italic text-[0.85rem] text-[var(--crimson)]">
          {error}
        </p>
      )}
    </div>
  );
}
