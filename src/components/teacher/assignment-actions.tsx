"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Edit / delete buttons for an assignment. Lives in the teacher assignment page.
export function AssignmentActions({
  assignmentId,
  classId,
  currentTitle,
  currentPrompt,
}: {
  assignmentId: string;
  classId: string;
  currentTitle: string;
  currentPrompt: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function renameTitle() {
    const next = window.prompt("Novo título:", currentTitle);
    if (!next || next.trim() === currentTitle.trim()) return;
    setBusy(true);
    const r = await fetch(`/api/assignment/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: next.trim() }),
    });
    setBusy(false);
    if (!r.ok) return alert("Não consegui renomear.");
    router.refresh();
  }

  async function editPrompt() {
    const next = window.prompt("Briefing/enunciado:", currentPrompt);
    if (next === null || next.trim() === currentPrompt.trim()) return;
    setBusy(true);
    const r = await fetch(`/api/assignment/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ prompt: next.trim() }),
    });
    setBusy(false);
    if (!r.ok) return alert("Não consegui salvar.");
    router.refresh();
  }

  async function destroy() {
    if (
      !window.confirm(
        `Apagar a tarefa "${currentTitle}"? Os trabalhos dos alunos serão perdidos.`,
      )
    )
      return;
    setBusy(true);
    const r = await fetch(`/api/assignment/${assignmentId}`, {
      method: "DELETE",
      credentials: "include",
    });
    setBusy(false);
    if (!r.ok) return alert("Não consegui apagar.");
    router.push(`/teacher/classes/${classId}`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={renameTitle}
        disabled={busy}
        className="body-serif italic text-[0.82rem] px-3 py-1 rounded-full transition-all hover:translate-y-[-1px] disabled:opacity-50"
        style={{
          background: "transparent",
          border: "1px solid var(--paper-edge)",
          color: "var(--ink-soft)",
        }}
      >
        renomear
      </button>
      <button
        type="button"
        onClick={editPrompt}
        disabled={busy}
        className="body-serif italic text-[0.82rem] px-3 py-1 rounded-full transition-all hover:translate-y-[-1px] disabled:opacity-50"
        style={{
          background: "transparent",
          border: "1px solid var(--paper-edge)",
          color: "var(--ink-soft)",
        }}
      >
        editar briefing
      </button>
      <button
        type="button"
        onClick={destroy}
        disabled={busy}
        className="body-serif italic text-[0.82rem] px-3 py-1 rounded-full transition-all hover:translate-y-[-1px] disabled:opacity-50"
        style={{
          background: "transparent",
          border: "1px solid var(--paper-edge)",
          color: "var(--crimson)",
        }}
      >
        apagar
      </button>
    </div>
  );
}
