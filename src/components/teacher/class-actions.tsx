"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Edit / delete buttons for a class. Lives in the teacher class page header.
export function ClassActions({
  classId,
  currentName,
}: {
  classId: string;
  currentName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function rename() {
    const next = window.prompt("Novo nome da turma:", currentName);
    if (!next || next.trim() === currentName.trim()) return;
    setBusy(true);
    const r = await fetch(`/api/class/${classId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: next.trim() }),
    });
    setBusy(false);
    if (!r.ok) {
      alert("Não consegui renomear.");
      return;
    }
    router.refresh();
  }

  async function destroy() {
    if (
      !window.confirm(
        `Apagar a turma "${currentName}" e tudo dentro dela (alunos, aulas, livros)?`,
      )
    )
      return;
    setBusy(true);
    const r = await fetch(`/api/class/${classId}`, {
      method: "DELETE",
      credentials: "include",
    });
    setBusy(false);
    if (!r.ok) {
      alert("Não consegui apagar.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={rename}
        disabled={busy}
        className="body-serif italic text-[0.85rem] px-3 py-1 rounded-full transition-all hover:translate-y-[-1px] disabled:opacity-50"
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
        onClick={destroy}
        disabled={busy}
        className="body-serif italic text-[0.85rem] px-3 py-1 rounded-full transition-all hover:translate-y-[-1px] disabled:opacity-50"
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
