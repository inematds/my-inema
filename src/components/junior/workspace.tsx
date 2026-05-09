"use client";

import { useEffect, useState } from "react";
import { PanelCast } from "./panel-cast";
import { PanelObjects } from "./panel-objects";
import { PanelSettings } from "./panel-settings";
import { PanelScenes } from "./panel-scenes";
import { PanelFilm } from "./panel-film";
import { WorkspaceNav, type StageId } from "./workspace-nav";
import { JuniorProvider } from "./junior-context";
import { RenderMovieButton } from "./render-movie-button";

export type JuniorItem = {
  id: string;
  description: string;
  name: string | null;
  epithet: string | null;
  image_data: string | null;
  position: number;
  created_at: string;
};

export type JuniorScene = JuniorItem & {
  setting_id: string | null;
  character_ids: string[];
  object_ids: string[];
};

export type BookState = {
  book: {
    id: string;
    title: string | null;
    createdAt: string;
    lessonType: string;
    publishedAt: string | null;
    publishedTitle: string | null;
    publishedScope: "class" | "global" | string;
    attemptId: string | null;
  };
  characters: JuniorItem[];
  objects: JuniorItem[];
  settings: JuniorItem[];
  scenes: JuniorScene[];
};

const STAGES: { id: StageId; label: string; index: number }[] = [
  { id: "characters", label: "Personagens", index: 1 },
  { id: "objects", label: "Objetos", index: 2 },
  { id: "settings", label: "Cenários", index: 3 },
  { id: "scenes", label: "Cenas", index: 4 },
  { id: "book", label: "Livro", index: 5 },
  { id: "movies", label: "Filmes", index: 6 },
];

export function Workspace({ attemptId = null }: { attemptId?: string | null } = {}) {
  const [state, setState] = useState<BookState | null>(null);
  const [stage, setStage] = useState<StageId>("characters");
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    const headers: HeadersInit = attemptId ? { "x-attempt-id": attemptId } : {};
    fetch("/api/junior/book/state", { credentials: "include", headers })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: BookState) => setState(d))
      .catch((e) => setBootError(e.message));
  }, [attemptId]);

  if (bootError) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 body-serif text-[var(--crimson)]">
        Não consegui abrir seu livro: {bootError}
      </div>
    );
  }

  if (!state) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 body-serif italic text-[var(--ink-faint)]">
        abrindo seu livro...
      </div>
    );
  }

  const characterCount = state.characters.length;
  const sceneCount = state.scenes.length;

  const stageLocked: Record<StageId, { locked: boolean; hint: string }> = {
    characters: { locked: false, hint: "" },
    objects: {
      locked: characterCount === 0,
      hint: "destrava com pelo menos 1 personagem",
    },
    settings: {
      locked: characterCount === 0,
      hint: "destrava com pelo menos 1 personagem",
    },
    scenes: {
      locked: characterCount === 0,
      hint: "destrava com pelo menos 1 personagem",
    },
    book: {
      locked: sceneCount === 0,
      hint: "destrava com pelo menos uma cena",
    },
    movies: {
      locked: sceneCount === 0,
      hint: "destrava com pelo menos uma cena",
    },
  };

  function handleCharacterCreated(item: JuniorItem) {
    setState((s) => (s ? { ...s, characters: [...s.characters, item] } : s));
  }
  function handleCharacterDeleted(id: string) {
    setState((s) =>
      s ? { ...s, characters: s.characters.filter((c) => c.id !== id) } : s,
    );
  }
  function handleObjectCreated(item: JuniorItem) {
    setState((s) => (s ? { ...s, objects: [...s.objects, item] } : s));
  }
  function handleObjectDeleted(id: string) {
    setState((s) =>
      s ? { ...s, objects: s.objects.filter((c) => c.id !== id) } : s,
    );
  }
  function handleSettingCreated(item: JuniorItem) {
    setState((s) => (s ? { ...s, settings: [...s.settings, item] } : s));
  }
  function handleSettingDeleted(id: string) {
    setState((s) =>
      s ? { ...s, settings: s.settings.filter((c) => c.id !== id) } : s,
    );
  }
  function handleSceneCreated(scene: JuniorScene) {
    setState((s) => (s ? { ...s, scenes: [...s.scenes, scene] } : s));
  }
  function handleSceneDeleted(id: string) {
    setState((s) =>
      s ? { ...s, scenes: s.scenes.filter((c) => c.id !== id) } : s,
    );
  }
  function handlePublicationChange(p: {
    publishedAt: string | null;
    publishedTitle: string | null;
    publishedScope?: "class" | "global";
  }) {
    setState((s) => (s ? { ...s, book: { ...s.book, ...p } } : s));
  }

  return (
   <JuniorProvider attemptId={attemptId}>
    <div className="relative w-full max-w-[1200px] mx-auto px-6 lg:px-10 pb-16 pt-2">
      <WorkspaceNav
        stages={STAGES}
        active={stage}
        onSelect={(s) => {
          if (!stageLocked[s].locked) setStage(s);
        }}
        locked={stageLocked}
      />
      <div className="mt-10">
        {stage === "characters" && (
          <PanelCast
            characters={state.characters}
            onCreated={handleCharacterCreated}
            onDeleted={handleCharacterDeleted}
          />
        )}
        {stage === "objects" && !stageLocked.objects.locked && (
          <PanelObjects
            objects={state.objects}
            onCreated={handleObjectCreated}
            onDeleted={handleObjectDeleted}
          />
        )}
        {stage === "settings" && !stageLocked.settings.locked && (
          <PanelSettings
            settings={state.settings}
            onCreated={handleSettingCreated}
            onDeleted={handleSettingDeleted}
          />
        )}
        {stage === "scenes" && !stageLocked.scenes.locked && (
          <PanelScenes
            characters={state.characters}
            objects={state.objects}
            settings={state.settings}
            scenes={state.scenes}
            onCreated={handleSceneCreated}
            onDeleted={handleSceneDeleted}
          />
        )}
        {stage === "book" && !stageLocked.book.locked && (
          <PanelFilm
            scenes={state.scenes}
            publishedAt={state.book.publishedAt}
            publishedTitle={state.book.publishedTitle}
            publishedScope={
              state.book.publishedScope === "class" ? "class" : "global"
            }
            attemptBound={Boolean(state.book.attemptId)}
            onPublicationChange={handlePublicationChange}
          />
        )}
        {stage === "movies" && !stageLocked.movies.locked && (
          <div className="flex flex-col items-center gap-4 py-12 max-w-[640px] mx-auto">
            <p className="body-serif italic text-[0.85rem] tracking-wide text-[var(--ink-faint)]">
              ato 6 · filmes
            </p>
            <h2 className="display text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.05] text-[var(--ink)] text-center">
              transforme em filme
            </h2>
            <p className="body-serif italic text-[0.95rem] text-[var(--ink-faint)] text-center max-w-[52ch] leading-snug">
              gera um vídeo curto (cerca de 5 segundos por cena) com fade
              entre as cenas. baixa em .webm pra compartilhar.
              <br />
              <span className="text-[0.85rem]">
                voz e movimento mais elaborado virão na próxima fatia (Remotion).
              </span>
            </p>
            <RenderMovieButton
              title={state.book.publishedTitle ?? "Meu livro"}
              scenes={state.scenes}
            />
          </div>
        )}
      </div>
    </div>
   </JuniorProvider>
  );
}
