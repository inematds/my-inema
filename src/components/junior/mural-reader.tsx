"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PanelFilm } from "./panel-film";
import type { JuniorScene } from "./workspace";
import { lessonLabel } from "@/lib/junior/lesson-types";

type Publication = {
  id: string;
  lesson_type: string;
  title: string | null;
  published_at: string;
  scenes: {
    id: string;
    name: string | null;
    epithet: string | null;
    image_data: string | null;
    position: number;
  }[];
};

export function MuralReader({ id }: { id: string }) {
  const [pub, setPub] = useState<Publication | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/mural/${id}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { publication: Publication }) => setPub(d.publication))
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <p className="body-serif text-[var(--crimson)] italic">
        Não consegui abrir esse livro: {error}
      </p>
    );
  }
  if (!pub) {
    return (
      <p className="body-serif italic text-[var(--ink-faint)]">
        abrindo o livro...
      </p>
    );
  }

  // Adapt mural scene rows to the JuniorScene shape PanelFilm expects.
  const scenes: JuniorScene[] = pub.scenes.map((s) => ({
    id: s.id,
    description: "",
    name: s.name,
    epithet: s.epithet,
    image_data: s.image_data,
    position: s.position,
    created_at: pub.published_at,
    setting_id: null,
    character_ids: [],
    object_ids: [],
  }));

  const when = new Date(pub.published_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/mural"
          className="body-serif italic text-[0.92rem] text-[var(--ink-faint)] hover:text-[var(--magic)] transition-colors w-fit"
        >
          ← voltar pro mural
        </Link>
        <h1 className="display text-[clamp(2rem,4vw,3.4rem)] leading-[0.95] text-[var(--ink)]">
          {pub.title ?? "sem título"}
        </h1>
        <p className="body-serif italic text-[0.9rem] text-[var(--ink-faint)]">
          {lessonLabel(pub.lesson_type)} · publicado em {when}
        </p>
      </header>

      <PanelFilm scenes={scenes} readOnly />
    </div>
  );
}
