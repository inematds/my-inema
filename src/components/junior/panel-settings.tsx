"use client";

import { CastCard } from "./cast-card";
import { IllustrationCreator } from "./illustration-creator";
import type { JuniorItem } from "./workspace";

export function PanelSettings({
  settings,
  onCreated,
  onDeleted,
}: {
  settings: JuniorItem[];
  onCreated: (item: JuniorItem) => void;
  onDeleted: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10 lg:gap-14 items-start">
      <aside className="order-2 lg:order-1 lg:sticky lg:top-4">
        <p className="body-serif italic text-[0.85rem] text-[var(--ink-faint)] tracking-wide mb-4">
          seu mundo até agora
        </p>
        {settings.length === 0 ? (
          <p className="body-serif italic text-[0.95rem] text-[var(--ink-faint)] leading-snug">
            nenhum lugar ainda. descreve o primeiro ali do lado.
          </p>
        ) : (
          <div className="flex flex-col gap-6 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto pr-1 -mx-1 px-1">
            {settings.map((c) => (
              <CastCard
                key={c.id}
                item={c}
                endpointDelete={`/api/junior/setting/${c.id}`}
                onDelete={onDeleted}
                variant="setting"
              />
            ))}
          </div>
        )}
      </aside>
      <div className="order-1 lg:order-2">
        <IllustrationCreator
          kind="setting"
          endpoint="/api/junior/setting/create"
          onCreate={onCreated}
        />
      </div>
    </div>
  );
}
