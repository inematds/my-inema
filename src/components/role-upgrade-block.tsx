"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Visible only to logged-in students. Lets them self-upgrade to teacher or
// parent without going through signup again.
export function RoleUpgradeBlock() {
  const router = useRouter();
  const [busy, setBusy] = useState<"teacher" | "parent" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function become(role: "teacher" | "parent") {
    if (busy) return;
    setBusy(role);
    setError(null);
    try {
      const r = await fetch("/api/auth/become", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? "Não consegui trocar.");
        return;
      }
      router.refresh();
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="w-full max-w-3xl flex flex-col gap-3 mt-4">
      <p className="body-serif italic text-[0.85rem] text-[var(--ink-faint)] text-center">
        é professor ou pai/mãe? abra o painel pra criar tarefas:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UpgradeButton
          onClick={() => become("teacher")}
          busy={busy === "teacher"}
          title="virar professor"
          hint="criar turma, atribuir tarefas, ver os trabalhos"
        />
        <UpgradeButton
          onClick={() => become("parent")}
          busy={busy === "parent"}
          title="virar pai/mãe"
          hint="criar grupo da família e mandar tarefas pros filhos"
        />
      </div>
      {error && (
        <p
          role="alert"
          className="body-serif italic text-[0.9rem] text-[var(--crimson)] text-center"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function UpgradeButton({
  onClick,
  busy,
  title,
  hint,
}: {
  onClick: () => void;
  busy: boolean;
  title: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="text-left p-4 rounded-[14px] border-2 transition-all hover:translate-y-[-1px] disabled:opacity-50"
      style={{
        background: "var(--paper)",
        borderColor: "var(--paper-edge)",
      }}
    >
      <p className="display tracking-tight text-[1rem] text-[var(--ink)]">
        {busy ? "trocando..." : title}{" "}
        <span className="display-italic text-[var(--magic)]">→</span>
      </p>
      <p className="body-serif italic text-[0.78rem] text-[var(--ink-faint)] mt-1 leading-snug">
        {hint}
      </p>
    </button>
  );
}
