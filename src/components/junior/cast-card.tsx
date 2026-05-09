"use client";

import { useState } from "react";
import type { JuniorItem } from "./workspace";
import { useJuniorContext } from "./junior-context";

export function CastCard({
  item,
  endpointDelete,
  onDelete,
  variant = "character",
}: {
  item: JuniorItem;
  endpointDelete: string;
  onDelete: (id: string) => void;
  variant?: "character" | "object" | "setting";
}) {
  const [deleting, setDeleting] = useState(false);
  const tilt = useStableTilt(item.id);
  const { apiHeaders } = useJuniorContext();

  async function handleDelete() {
    if (deleting) return;
    if (!confirm(`Apagar ${item.name ?? "este"}?`)) return;
    setDeleting(true);
    try {
      const r = await fetch(endpointDelete, {
        method: "DELETE",
        credentials: "include",
        headers: apiHeaders(),
      });
      if (r.ok) onDelete(item.id);
      else setDeleting(false);
    } catch {
      setDeleting(false);
    }
  }

  const imageSrc = item.image_data
    ? `data:image/png;base64,${item.image_data}`
    : null;

  return (
    <article
      className="relative w-[200px] shrink-0 animate-paper-settle"
      style={{ ["--tilt" as string]: `${tilt}deg` }}
    >
      <div
        className="relative aspect-square rounded-[4px]"
        style={{
          background: "linear-gradient(180deg, #f4ead4 0%, #ead8b3 100%)",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 36px -22px rgba(29,25,22,0.4), 0 4px 10px -4px rgba(29,25,22,0.18)",
          transform: "rotate(var(--tilt))",
        }}
      >
        <div
          className="absolute inset-[8px] rounded-[2px] overflow-hidden"
          style={{
            border: "1px solid var(--ink)",
            boxShadow:
              "inset 0 0 0 4px var(--paper), inset 0 0 0 5px var(--ink)",
            background: "var(--paper)",
          }}
        >
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={item.name ?? "ilustração"}
              className="absolute inset-[18px] object-cover w-[calc(100%-36px)] h-[calc(100%-36px)] rounded-[2px]"
            />
          ) : (
            <div className="absolute inset-[18px] grid place-items-center body-serif italic text-[0.8rem] text-[var(--ink-faint)]">
              sem imagem
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 px-1" style={{ transform: `rotate(${tilt}deg)` }}>
        {item.name ? (
          <>
            <p className="display text-[1.15rem] leading-[1] text-[var(--ink)] tracking-tight">
              {item.name}
            </p>
            {item.epithet && (
              <p className="display-italic text-[0.78rem] text-[var(--magic)] mt-1 leading-tight line-clamp-2">
                {item.epithet}
              </p>
            )}
          </>
        ) : (
          <p className="display-italic text-[0.92rem] text-[var(--ink-soft)] leading-tight">
            {variant === "character" ? "personagem" : variant === "object" ? "objeto" : "lugar"}
          </p>
        )}
      </div>
      <button
        onClick={handleDelete}
        disabled={deleting}
        aria-label={`apagar ${item.name ?? "este"}`}
        className="absolute -top-2 -right-2 size-6 rounded-full grid place-items-center transition opacity-0 group-hover:opacity-100 hover:scale-110 disabled:opacity-30"
        style={{
          background: "var(--paper)",
          color: "var(--ink-soft)",
          border: "1px solid var(--paper-edge)",
          boxShadow: "0 2px 6px -2px rgba(29,25,22,0.2)",
          opacity: 1,
        }}
      >
        <svg
          viewBox="0 0 16 16"
          width="11"
          height="11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </article>
  );
}

function useStableTilt(seed: string): number {
  // Hash the id to a tilt in [-2.5, 2.5] degrees so each card has a
  // consistent paper-pile angle but the row doesn't all line up.
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const t = (((h % 1000) + 1000) % 1000) / 1000; // 0..1
  return -2.5 + t * 5;
}
