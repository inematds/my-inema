"use client";

export type StageId = "characters" | "objects" | "settings" | "scenes" | "book" | "movies";

export function WorkspaceNav({
  stages,
  active,
  onSelect,
  locked,
}: {
  stages: { id: StageId; label: string; index: number }[];
  active: StageId;
  onSelect: (s: StageId) => void;
  locked: Record<StageId, { locked: boolean; hint: string }>;
}) {
  return (
    <nav aria-label="Etapas do livro" className="relative">
      <ol className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-5">
        {stages.map((s) => {
          const isActive = active === s.id;
          const isLocked = locked[s.id].locked;
          return (
            <li key={s.id} className="relative">
              <button
                onClick={() => onSelect(s.id)}
                disabled={isLocked}
                className="w-full text-left group transition-all"
              >
                <div className="flex items-baseline gap-3">
                  <span
                    className="display-italic text-[1.4rem] tabular-nums"
                    style={{
                      color: isActive
                        ? "var(--magic)"
                        : isLocked
                          ? "var(--ink-faint)"
                          : "var(--ink-soft)",
                      opacity: isLocked ? 0.5 : 1,
                    }}
                  >
                    {String(s.index).padStart(2, "0")}
                  </span>
                  <span
                    className="display text-[clamp(1.05rem,1.6vw,1.35rem)] leading-[1] tracking-tight"
                    style={{
                      color: isActive
                        ? "var(--ink)"
                        : isLocked
                          ? "var(--ink-faint)"
                          : "var(--ink-soft)",
                      opacity: isLocked ? 0.6 : 1,
                    }}
                  >
                    {s.label}
                    {isLocked && (
                      <LockGlyph className="inline-block ml-2 -translate-y-[1px]" />
                    )}
                  </span>
                </div>
                <div
                  className="mt-2 h-[2px] origin-left transition-all"
                  style={{
                    background: isActive
                      ? "var(--magic)"
                      : isLocked
                        ? "transparent"
                        : "var(--paper-edge)",
                    width: isActive ? "100%" : "70%",
                  }}
                />
                {isLocked && locked[s.id].hint && (
                  <p className="body-serif italic text-[0.78rem] text-[var(--ink-faint)] mt-2 leading-snug">
                    {locked[s.id].hint}
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function LockGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="11"
      height="11"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
