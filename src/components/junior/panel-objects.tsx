"use client";

import { CastCard } from "./cast-card";
import { IllustrationCreator } from "./illustration-creator";
import type { JuniorItem } from "./workspace";

export function PanelObjects({
  objects,
  onCreated,
  onDeleted,
}: {
  objects: JuniorItem[];
  onCreated: (item: JuniorItem) => void;
  onDeleted: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10 lg:gap-14 items-start">
      <aside className="order-2 lg:order-1 lg:sticky lg:top-4">
        <p className="body-serif italic text-[0.85rem] text-[var(--ink-faint)] tracking-wide mb-4">
          a estante até agora
        </p>
        {objects.length === 0 ? (
          <p className="body-serif italic text-[0.95rem] text-[var(--ink-faint)] leading-snug">
            nenhum objeto ainda. inventa o primeiro ali do lado — ou pula
            direto pros cenários.
          </p>
        ) : (
          <div className="flex flex-col gap-6 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto pr-1 -mx-1 px-1">
            {objects.map((c) => (
              <CastCard
                key={c.id}
                item={c}
                endpointDelete={`/api/junior/object/${c.id}`}
                onDelete={onDeleted}
                variant="object"
              />
            ))}
          </div>
        )}
      </aside>
      <div className="order-1 lg:order-2">
        <IllustrationCreator
          kind="object"
          endpoint="/api/junior/object/create"
          onCreate={onCreated}
        />
      </div>
    </div>
  );
}
