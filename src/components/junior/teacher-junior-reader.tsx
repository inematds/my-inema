"use client";

import Link from "next/link";
import { PanelFilm } from "./panel-film";
import type { JuniorScene } from "./workspace";

export function TeacherJuniorReader({
  assignmentTitle,
  className,
  studentName,
  attemptStatus,
  book,
  scenes,
}: {
  assignmentTitle: string;
  className: string;
  studentName: string;
  attemptStatus: string;
  book: {
    published_at: string | null;
    published_title: string | null;
    published_scope: string;
  };
  scenes: {
    id: string;
    name: string | null;
    epithet: string | null;
    image_data: string | null;
    position: number;
  }[];
}) {
  // Adapt to JuniorScene shape PanelFilm wants.
  const adapted: JuniorScene[] = scenes.map((s) => ({
    id: s.id,
    description: "",
    name: s.name,
    epithet: s.epithet,
    image_data: s.image_data,
    position: s.position,
    created_at: book.published_at ?? new Date(0).toISOString(),
    setting_id: null,
    character_ids: [],
    object_ids: [],
  }));

  return (
    <div className="-m-6 p-0">
      <div className="relative w-full max-w-[1200px] mx-auto px-6 lg:px-10 pb-16 pt-6">
        <header className="mb-6 flex flex-col gap-2">
          <Link
            href="/dashboard"
            className="body-serif italic text-[0.92rem] text-[var(--ink-faint)] hover:text-[var(--magic)] transition-colors w-fit"
          >
            ← voltar pro dashboard
          </Link>
          <p className="body-serif italic text-[0.85rem] tracking-wide text-[var(--ink-faint)]">
            {className} · {assignmentTitle}
          </p>
          <h1 className="display text-[clamp(1.6rem,3.2vw,2.4rem)] leading-[0.95] text-[var(--ink)]">
            livro de <span className="display-italic text-[var(--magic)]">{studentName}</span>
          </h1>
          <p className="body-serif text-[0.92rem] italic text-[var(--ink-faint)]">
            {attemptStatus === "submitted"
              ? `entregue · ${book.published_at ? new Date(book.published_at).toLocaleString("pt-BR") : ""}`
              : "ainda em andamento"}
            {book.published_at &&
              ` · publicado ${book.published_scope === "class" ? "na turma" : "no mural geral"}`}
          </p>
        </header>

        {scenes.length === 0 ? (
          <p className="body-serif italic text-[var(--ink-faint)]">
            esse aluno ainda não criou cenas.
          </p>
        ) : (
          <PanelFilm scenes={adapted} readOnly />
        )}
      </div>
    </div>
  );
}
