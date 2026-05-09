"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Notification = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

// Polled bell: shows unread count, opens dropdown with the latest 50.
// Marks all as read on open.
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/notifications", { credentials: "include" });
      if (!r.ok) return;
      const j = await r.json();
      setItems(j.notifications ?? []);
      setUnread(j.unread ?? 0);
    } catch {
      /* noop */
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  // Close on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      // Optimistic clear; server marks read.
      setUnread(0);
      try {
        await fetch("/api/notifications", {
          method: "POST",
          credentials: "include",
        });
        load();
      } catch {
        /* noop */
      }
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={toggle}
        aria-label={`notificações${unread > 0 ? `: ${unread} não lidas` : ""}`}
        className="body-serif italic text-[0.92rem] text-[var(--ink-soft)] hover:text-[var(--magic)] transition-colors relative"
      >
        notificações
        {unread > 0 && (
          <span
            className="absolute -top-1.5 -right-3 text-[0.65rem] tabular-nums px-1.5 py-0.5 rounded-full"
            style={{
              background: "var(--crimson)",
              color: "var(--paper)",
              minWidth: "1.2rem",
              textAlign: "center",
              lineHeight: 1,
            }}
          >
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[320px] max-h-[420px] overflow-y-auto rounded-[14px] z-30"
          style={{
            background: "var(--paper)",
            border: "1px solid var(--paper-edge)",
            boxShadow: "0 18px 36px -22px rgba(29,25,22,0.4)",
          }}
        >
          {items.length === 0 ? (
            <p className="body-serif italic text-[0.9rem] text-[var(--ink-faint)] p-4">
              nada por aqui ainda.
            </p>
          ) : (
            <ul className="flex flex-col">
              {items.map((n) => (
                <li
                  key={n.id}
                  className="px-4 py-2 border-b last:border-b-0"
                  style={{ borderColor: "var(--paper-edge)" }}
                >
                  <NotificationLine n={n} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationLine({ n }: { n: Notification }) {
  const when = new Date(n.created_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  let content: React.ReactNode = null;

  const p = n.payload as {
    attempt_id?: string;
    assignment_id?: string;
    title?: string;
    excerpt?: string;
    assignment_title?: string;
    scope?: string;
    lesson_type?: string;
  };

  switch (n.kind) {
    case "book_published":
      content = (
        <Link
          href={p.attempt_id ? `/teacher/junior/${p.attempt_id}` : "/dashboard"}
          className="body-serif text-[0.92rem] text-[var(--ink)] hover:text-[var(--magic)]"
        >
          📖 aluno publicou{" "}
          <strong className="display not-italic">{p.title ?? "um livro"}</strong>
          {p.assignment_title ? ` em ${p.assignment_title}` : ""}
        </Link>
      );
      break;
    case "book_feedback":
      content = (
        <Link
          href={p.attempt_id ? `/student/assignment/${p.assignment_id ?? ""}` : "/dashboard"}
          className="body-serif text-[0.92rem] text-[var(--ink)] hover:text-[var(--magic)]"
        >
          ✏️ professor comentou: <em>&ldquo;{p.excerpt ?? ""}&rdquo;</em>
        </Link>
      );
      break;
    case "new_assignment":
      content = (
        <Link
          href={p.assignment_id ? `/student/assignment/${p.assignment_id}` : "/dashboard"}
          className="body-serif text-[0.92rem] text-[var(--ink)] hover:text-[var(--magic)]"
        >
          🆕 nova tarefa:{" "}
          <strong className="display not-italic">{p.title ?? "tarefa"}</strong>
        </Link>
      );
      break;
    case "message_received":
      content = (
        <Link
          href="/dashboard"
          className="body-serif text-[0.92rem] text-[var(--ink)] hover:text-[var(--magic)]"
        >
          💬 nova mensagem: <em>&ldquo;{p.excerpt ?? ""}&rdquo;</em>
        </Link>
      );
      break;
    case "attempt_featured":
      content = (
        <span className="body-serif text-[0.92rem] text-[var(--ink)]">
          ★ seu livro foi <em>destacado</em> pelo professor!
        </span>
      );
      break;
    default:
      content = (
        <span className="body-serif italic text-[0.92rem] text-[var(--ink-faint)]">
          {n.kind}
        </span>
      );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {content}
      <span className="body-serif italic text-[0.7rem] text-[var(--ink-faint)]">
        {when}
        {!n.read_at && <span className="ml-2 text-[var(--magic)]">novo</span>}
      </span>
    </div>
  );
}
