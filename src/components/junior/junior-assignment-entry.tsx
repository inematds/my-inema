"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Workspace } from "./workspace";
import { ChatThread } from "@/components/chat-thread";

// Bridge component for the classroom flow: starts/finds the attempt for this
// junior_books assignment, then renders the Workspace bound to that attempt.
export function JuniorAssignmentEntry({
  assignmentId,
  title,
  prompt,
  studentId,
}: {
  assignmentId: string;
  title: string;
  prompt: string;
  studentId: string;
}) {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/attempt/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ assignmentId, initial: "" }),
        });
        const j = await r.json();
        if (!r.ok || !j.attemptId) {
          if (!cancelled) setError(j.error ?? "Não consegui abrir a aula.");
          return;
        }
        if (!cancelled) setAttemptId(j.attemptId);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 max-w-2xl mx-auto">
        <p className="text-destructive">{error}</p>
        <Link href="/dashboard" className="underline text-sm">
          ← voltar
        </Link>
      </div>
    );
  }

  if (starting || !attemptId) {
    return (
      <div className="p-8 text-muted-foreground italic max-w-2xl mx-auto">
        abrindo a aula...
      </div>
    );
  }

  return (
    <div className="-m-6 p-0">
      {prompt && prompt.trim().length > 0 && (
        <div className="px-8 pt-6">
          <p className="body-serif italic text-[0.85rem] tracking-wide text-[var(--ink-faint)]">
            briefing da aula · {title}
          </p>
          <p className="body-serif text-[1rem] text-[var(--ink-soft)] max-w-[60ch] mt-1 leading-snug">
            {prompt}
          </p>
        </div>
      )}
      <Workspace attemptId={attemptId} />
      <div className="px-8 pb-12 mt-6">
        <ChatThread attemptId={attemptId} currentUserId={studentId} />
      </div>
    </div>
  );
}
