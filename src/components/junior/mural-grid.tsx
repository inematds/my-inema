"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { lessonLabel } from "@/lib/junior/lesson-types";

type Publication = {
  id: string;
  lesson_type: string;
  title: string | null;
  published_at: string;
  published_scope?: string;
  assignment_title?: string | null;
  scene_count: number;
  cover_image_data: string | null;
};

export function MuralGrid({
  assignmentId,
  classId,
}: {
  assignmentId?: string;
  classId?: string;
} = {}) {
  const [items, setItems] = useState<Publication[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (assignmentId) params.set("assignmentId", assignmentId);
    if (classId) params.set("classId", classId);
    const qs = params.toString();
    const url = qs ? `/api/mural?${qs}` : "/api/mural";
    fetch(url, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { publications: Publication[] }) => setItems(d.publications))
      .catch((e) => setError(e.message));
  }, [assignmentId, classId]);

  if (error) {
    return (
      <p className="body-serif text-[var(--crimson)] italic">
        Não consegui ler o mural: {error}
      </p>
    );
  }

  if (!items) {
    return (
      <p className="body-serif italic text-[var(--ink-faint)]">
        carregando o mural...
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="body-serif italic text-[var(--ink-faint)]">
        ninguém publicou ainda. seja o primeiro — termine seu filme e aperte
        publicar.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
      {items.map((p) => (
        <li key={p.id}>
          <Link
            href={`/mural/${p.id}`}
            className="block group transition-all hover:translate-y-[-2px]"
          >
            <Cover imageData={p.cover_image_data} />
            <div className="mt-3 px-1">
              <p className="display text-[1.1rem] leading-[1.05] text-[var(--ink)] tracking-tight line-clamp-2">
                {p.title ?? "sem título"}
              </p>
              <p className="display-italic text-[0.78rem] text-[var(--ink-faint)] mt-1 leading-tight">
                {lessonLabel(p.lesson_type)} · {p.scene_count}{" "}
                {p.scene_count === 1 ? "cena" : "cenas"}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Cover({ imageData }: { imageData: string | null }) {
  const src = imageData ? `data:image/png;base64,${imageData}` : null;
  return (
    <div
      className="relative aspect-[3/4] rounded-[4px]"
      style={{
        background: "linear-gradient(180deg, #f4ead4 0%, #ead8b3 100%)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 36px -22px rgba(29,25,22,0.4), 0 4px 10px -4px rgba(29,25,22,0.18)",
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
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="absolute inset-[18px] object-cover w-[calc(100%-36px)] h-[calc(100%-36px)] rounded-[2px]"
          />
        ) : (
          <div className="absolute inset-[18px] grid place-items-center body-serif italic text-[0.8rem] text-[var(--ink-faint)]">
            sem imagem
          </div>
        )}
      </div>
    </div>
  );
}
