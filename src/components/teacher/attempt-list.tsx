"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type Attempt = {
  id: string;
  status: string;
  autonomy_score: number | null;
  user_name?: string;
  user_email?: string;
  published: boolean;
};

type Filter = "all" | "in_progress" | "done";

export function AttemptList({
  assignmentId,
  lessonType,
  featuredAttemptId,
  attempts,
}: {
  assignmentId: string;
  lessonType: string;
  featuredAttemptId: string | null;
  attempts: Attempt[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [featured, setFeatured] = useState<string | null>(featuredAttemptId);
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = attempts.filter((a) => {
    if (filter === "all") return true;
    if (filter === "in_progress") return a.status === "in_progress";
    if (filter === "done") return a.status === "submitted";
    return true;
  });

  async function toggleFeature(attemptId: string) {
    if (busy) return;
    setBusy(attemptId);
    const newValue = featured === attemptId ? null : attemptId;
    const r = await fetch(`/api/assignment/${assignmentId}/feature`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ attemptId: newValue }),
    });
    if (r.ok) setFeatured(newValue);
    setBusy(null);
  }

  if (attempts.length === 0) {
    return (
      <p className="body-serif italic text-[var(--ink-faint)]">
        Nenhum aluno começou esta tarefa ainda.
      </p>
    );
  }

  const isJunior = lessonType === "junior_books";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
          todos ({attempts.length})
        </FilterPill>
        <FilterPill
          active={filter === "in_progress"}
          onClick={() => setFilter("in_progress")}
        >
          em andamento ({attempts.filter((a) => a.status === "in_progress").length})
        </FilterPill>
        <FilterPill active={filter === "done"} onClick={() => setFilter("done")}>
          {isJunior ? "publicados" : "entregues"} (
          {attempts.filter((a) => a.status === "submitted").length})
        </FilterPill>
      </div>

      <div className="grid gap-2">
        {filtered.map((a) => {
          const isFeatured = featured === a.id;
          return (
            <div
              key={a.id}
              className="rounded-md border-2 p-3 flex items-center justify-between gap-3 transition-colors"
              style={{
                borderColor: isFeatured ? "var(--magic)" : "var(--paper-edge)",
                background: isFeatured ? "rgba(14,84,76,0.05)" : "var(--paper)",
              }}
            >
              <Link
                href={isJunior ? `/teacher/junior/${a.id}` : `/teacher/attempts/${a.id}`}
                className="flex-1 min-w-0"
              >
                <div className="flex items-baseline gap-2">
                  {isFeatured && (
                    <span aria-label="destaque" title="destaque" className="text-[var(--amber)] text-sm">
                      ★
                    </span>
                  )}
                  <span className="display tracking-tight text-[1.05rem] truncate">
                    {a.user_name ?? "—"}
                  </span>
                </div>
                <div className="text-xs text-[var(--ink-faint)] truncate">
                  {a.user_email}
                </div>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                {a.status === "submitted" ? (
                  isJunior ? (
                    a.published ? (
                      <Badge>publicado</Badge>
                    ) : (
                      <Badge variant="outline">entregue</Badge>
                    )
                  ) : (
                    <Badge>autonomia {a.autonomy_score ?? "—"}</Badge>
                  )
                ) : (
                  <Badge variant="outline">em andamento</Badge>
                )}
                {isJunior && a.status === "submitted" && a.published && (
                  <button
                    onClick={() => toggleFeature(a.id)}
                    disabled={busy === a.id}
                    className="body-serif italic text-[0.82rem] px-2 py-1 rounded-full transition-colors disabled:opacity-50"
                    style={{
                      color: isFeatured ? "var(--amber)" : "var(--ink-faint)",
                    }}
                    aria-label={isFeatured ? "remover destaque" : "destacar"}
                    title={isFeatured ? "remover destaque" : "destacar"}
                  >
                    {isFeatured ? "★ destacado" : "☆ destacar"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="body-serif text-[0.85rem] px-3 py-1 rounded-full transition-all"
      style={{
        background: active ? "var(--paper)" : "transparent",
        border: `1px solid ${active ? "var(--magic)" : "var(--paper-edge)"}`,
        boxShadow: active ? "0 0 0 3px rgba(14, 84, 76, 0.12)" : "none",
        color: active ? "var(--ink)" : "var(--ink-soft)",
      }}
    >
      {children}
    </button>
  );
}
