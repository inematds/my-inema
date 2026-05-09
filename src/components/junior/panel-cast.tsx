"use client";

import { CastCard } from "./cast-card";
import { IllustrationCreator } from "./illustration-creator";
import type { JuniorItem } from "./workspace";

export function PanelCast({
  characters,
  onCreated,
  onDeleted,
}: {
  characters: JuniorItem[];
  onCreated: (item: JuniorItem) => void;
  onDeleted: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10 lg:gap-14 items-start">
      <aside className="order-2 lg:order-1 lg:sticky lg:top-4">
        <p className="body-serif italic text-[0.85rem] text-[var(--ink-faint)] tracking-wide mb-4">
          o elenco até agora
        </p>
        {characters.length === 0 ? (
          <p className="body-serif italic text-[0.95rem] text-[var(--ink-faint)] leading-snug">
            ninguém ainda. comece criando seu primeiro personagem ali do lado.
          </p>
        ) : (
          <div className="flex flex-col gap-6 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto pr-1 -mx-1 px-1">
            {characters.map((c) => (
              <CastCard
                key={c.id}
                item={c}
                endpointDelete={`/api/junior/character/${c.id}`}
                onDelete={onDeleted}
                variant="character"
              />
            ))}
          </div>
        )}
      </aside>
      <div className="order-1 lg:order-2">
        <IllustrationCreator
          kind="character"
          endpoint="/api/junior/character/create"
          onCreate={onCreated}
        />
      </div>
    </div>
  );
}
