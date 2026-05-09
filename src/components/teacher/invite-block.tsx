"use client";

import { useState } from "react";

// Copyable invite link + WhatsApp share. Shows for the teacher / parent who
// owns the class.
export function InviteBlock({
  code,
  className,
}: {
  code: string;
  className: string;
}) {
  const [copied, setCopied] = useState(false);

  // Build link from window.location to support LAN/Tailscale domains during dev.
  function inviteUrl() {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/student/join?code=${encodeURIComponent(code)}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }

  function whatsappUrl() {
    const text = `Entre na turma "${className}" no Andaime: ${inviteUrl()}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  return (
    <div
      className="rounded-[14px] border-2 p-3 flex flex-col gap-2"
      style={{
        background: "var(--paper)",
        borderColor: "var(--paper-edge)",
      }}
    >
      <p className="body-serif italic text-[0.78rem] tracking-wide text-[var(--ink-faint)]">
        convidar alunos
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code
          className="text-[0.85rem] flex-1 min-w-0 truncate px-2 py-1 rounded"
          style={{ background: "var(--paper-deep)", color: "var(--ink)" }}
        >
          {inviteUrl()}
        </code>
        <button
          type="button"
          onClick={copyLink}
          className="body-serif text-[0.85rem] px-3 py-1 rounded-full transition-all hover:translate-y-[-1px]"
          style={{
            background: copied ? "var(--magic)" : "var(--ink)",
            color: "var(--paper)",
          }}
        >
          {copied ? "copiado ✓" : "copiar"}
        </button>
        <a
          href={whatsappUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="body-serif text-[0.85rem] px-3 py-1 rounded-full transition-all hover:translate-y-[-1px]"
          style={{
            background: "transparent",
            border: "1px solid var(--paper-edge)",
            color: "var(--ink-soft)",
          }}
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}
