"use client";

import { useEffect, useRef, useState } from "react";
import type { JuniorItem, JuniorScene } from "./workspace";
import { CastCard } from "./cast-card";
import { useJuniorContext } from "./junior-context";

const MIN_CHARS = 30;

export function PanelScenes({
  characters,
  objects,
  settings,
  scenes,
  onCreated,
  onDeleted,
}: {
  characters: JuniorItem[];
  objects: JuniorItem[];
  settings: JuniorItem[];
  scenes: JuniorScene[];
  onCreated: (scene: JuniorScene) => void;
  onDeleted: (id: string) => void;
}) {
  const [settingId, setSettingId] = useState<string | null>(
    settings[0]?.id ?? null,
  );
  const [selectedChars, setSelectedChars] = useState<string[]>(
    characters[0] ? [characters[0].id] : [],
  );
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);
  const { apiHeaders } = useJuniorContext();

  useEffect(() => () => ctrlRef.current?.abort(), []);

  // flux2-klein cap is 4 refs total. Setting (if any) takes 1 slot;
  // remaining slots are shared between characters and objects.
  const totalBudget = settingId ? 3 : 4;
  const used = selectedChars.length + selectedObjects.length;
  const slotsLeft = Math.max(0, totalBudget - used);

  function toggleChar(id: string) {
    setSelectedChars((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (selectedChars.length + selectedObjects.length >= totalBudget) return prev;
      return [...prev, id];
    });
  }

  function toggleObject(id: string) {
    setSelectedObjects((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (selectedChars.length + selectedObjects.length >= totalBudget) return prev;
      return [...prev, id];
    });
  }

  function handleSettingToggle(id: string) {
    setSettingId((cur) => {
      const next = cur === id ? null : id;
      // Picking a setting cuts the budget from 4 to 3 — trim selections from
      // the right (drop objects first, then characters) so we never exceed.
      if (next && selectedChars.length + selectedObjects.length > 3) {
        const overflow = selectedChars.length + selectedObjects.length - 3;
        if (selectedObjects.length >= overflow) {
          setSelectedObjects((arr) => arr.slice(0, arr.length - overflow));
        } else {
          const dropFromObjects = selectedObjects.length;
          const dropFromChars = overflow - dropFromObjects;
          setSelectedObjects([]);
          setSelectedChars((arr) => arr.slice(0, arr.length - dropFromChars));
        }
      }
      return next;
    });
  }

  async function submit() {
    const text = description.trim();
    if (text.length < MIN_CHARS) return;
    if (selectedChars.length === 0) return;
    if (ctrlRef.current) ctrlRef.current.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), 130_000);
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const r = await fetch("/api/junior/scene/create", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          description: text,
          settingId,
          characterIds: selectedChars,
          objectIds: selectedObjects,
        }),
        signal: ctrl.signal,
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok || !j.scene) {
        setErrorMsg(messageFor(j.error));
        return;
      }
      onCreated(j.scene as JuniorScene);
      setDescription("");
    } catch (e) {
      const err = e as { name?: string };
      if (err?.name !== "AbortError") {
        setErrorMsg("Algo prendeu o pincel. Tenta de novo?");
      }
    } finally {
      clearTimeout(timer);
      if (ctrlRef.current === ctrl) ctrlRef.current = null;
      setSubmitting(false);
    }
  }

  const charCount = description.trim().length;
  const ready =
    charCount >= MIN_CHARS && selectedChars.length > 0 && !submitting;
  const progress = Math.min(charCount / MIN_CHARS, 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10 lg:gap-14 items-start">
      <aside className="order-2 lg:order-1 lg:sticky lg:top-4">
        <p className="body-serif italic text-[0.85rem] text-[var(--ink-faint)] tracking-wide mb-4">
          sua história até agora
        </p>
        {scenes.length === 0 ? (
          <p className="body-serif italic text-[0.95rem] text-[var(--ink-faint)] leading-snug">
            sem cenas ainda. crie a primeira ali do lado.
          </p>
        ) : (
          <div className="flex flex-col gap-6 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto pr-1 -mx-1 px-1">
            {scenes.map((s) => (
              <CastCard
                key={s.id}
                item={s}
                endpointDelete={`/api/junior/scene/${s.id}`}
                onDelete={onDeleted}
                variant="character"
              />
            ))}
          </div>
        )}
      </aside>

      <section className="order-1 lg:order-2 flex flex-col gap-5">
        <p className="body-serif italic text-[0.85rem] tracking-wide text-[var(--ink-faint)]">
          ato 4 · cenas
        </p>
        <h2 className="display text-[clamp(2rem,4.4vw,3.4rem)] leading-[0.95] text-[var(--ink)]">
          O que acontece{" "}
          <span className="display-italic text-[var(--magic)]">com eles?</span>
        </h2>
        <p className="body-serif text-[1rem] leading-[1.55] text-[var(--ink-soft)] max-w-[58ch]">
          Escolha o lugar, quem está nele e que objetos aparecem. Depois conta
          o que acontece. A ilustração vai usar suas escolhas como referência,
          então personagens e objetos continuam parecidos com o que você criou.
        </p>

        {/* Setting picker */}
        {settings.length > 0 && (
          <div className="mt-2">
            <p className="body-serif italic text-[0.78rem] text-[var(--ink-faint)] tracking-wide mb-2">
              onde
            </p>
            <div className="flex flex-wrap gap-3">
              {settings.map((s) => (
                <Chip
                  key={s.id}
                  item={s}
                  selected={settingId === s.id}
                  onToggle={() => handleSettingToggle(s.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Character picker */}
        <div>
          <p className="body-serif italic text-[0.78rem] text-[var(--ink-faint)] tracking-wide mb-2">
            quem está aqui{" "}
            <span className="text-[var(--ink-faint)]/70 not-italic">
              ({selectedChars.length} selecionado{selectedChars.length === 1 ? "" : "s"})
            </span>
          </p>
          <div className="flex flex-wrap gap-3">
            {characters.map((c) => (
              <Chip
                key={c.id}
                item={c}
                selected={selectedChars.includes(c.id)}
                onToggle={() => toggleChar(c.id)}
                disabledIfNotSelected={slotsLeft === 0}
              />
            ))}
          </div>
        </div>

        {/* Object picker — only when objects exist */}
        {objects.length > 0 && (
          <div>
            <p className="body-serif italic text-[0.78rem] text-[var(--ink-faint)] tracking-wide mb-2">
              o que aparece{" "}
              <span className="text-[var(--ink-faint)]/70 not-italic">
                ({selectedObjects.length} selecionado{selectedObjects.length === 1 ? "" : "s"})
              </span>
            </p>
            <div className="flex flex-wrap gap-3">
              {objects.map((o) => (
                <Chip
                  key={o.id}
                  item={o}
                  selected={selectedObjects.includes(o.id)}
                  onToggle={() => toggleObject(o.id)}
                  disabledIfNotSelected={slotsLeft === 0}
                />
              ))}
            </div>
          </div>
        )}

        <p className="body-serif italic text-[0.82rem] text-[var(--ink-faint)] -mt-1">
          {settingId
            ? `o ilustrador combina o cenário + até 3 entre personagens e objetos.`
            : `sem cenário, o ilustrador combina até 4 entre personagens e objetos.`}{" "}
          <span className="text-[var(--ink-soft)] not-italic">
            ({used} / {totalBudget} preenchidos)
          </span>
        </p>

        <div className="paper-card rounded-[20px] p-5 mt-1">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='Ex.: "O lobo encontra a coruja na clareira de noite e descobre que aquela pena no bolso era dela."'
            rows={5}
            disabled={submitting}
            className="body-serif w-full resize-none bg-transparent outline-none text-[1.05rem] leading-[1.6] text-[var(--ink)] placeholder:text-[var(--ink-faint)]/70 disabled:opacity-60"
            spellCheck={false}
          />
          <div className="mt-3 flex items-center gap-3">
            <div className="h-[3px] flex-1 bg-[var(--paper-edge)]/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress * 100}%`,
                  background:
                    charCount >= MIN_CHARS ? "var(--magic)" : "var(--amber-soft)",
                }}
              />
            </div>
            <span className="body-serif tabular-nums text-[0.85rem] text-[var(--ink-faint)] shrink-0">
              {charCount}
              <span className="opacity-60"> / {MIN_CHARS}+</span>
            </span>
          </div>
        </div>

        {errorMsg && (
          <p
            role="alert"
            className="body-serif text-[0.95rem] text-[var(--crimson)] italic"
          >
            {errorMsg}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-1">
          <button
            onClick={submit}
            disabled={!ready}
            className="body-serif text-[0.95rem] tracking-[0.02em] px-5 py-2.5 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:translate-y-[-1px] active:translate-y-0"
            style={{
              background: "var(--ink)",
              color: "var(--paper)",
              boxShadow: "0 8px 20px -10px rgba(29,25,22,0.4)",
            }}
          >
            {submitting ? "criando a cena..." : "criar esta cena"}
          </button>
          {submitting && (
            <span className="body-serif italic text-[0.9rem] text-[var(--ink-faint)] flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[var(--magic)] animate-pulse" />
              o ilustrador está pintando...
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

function Chip({
  item,
  selected,
  onToggle,
  disabledIfNotSelected = false,
}: {
  item: JuniorItem;
  selected: boolean;
  onToggle: () => void;
  disabledIfNotSelected?: boolean;
}) {
  const imageSrc = item.image_data
    ? `data:image/png;base64,${item.image_data}`
    : null;
  const dimmed = disabledIfNotSelected && !selected;
  return (
    <button
      onClick={onToggle}
      disabled={dimmed}
      className="flex items-center gap-3 pl-1.5 pr-4 py-1.5 rounded-full transition-all hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:hover:translate-y-0"
      style={{
        background: selected ? "var(--paper)" : "transparent",
        border: `1px solid ${selected ? "var(--magic)" : "var(--paper-edge)"}`,
        boxShadow: selected ? "0 0 0 3px rgba(14, 84, 76, 0.12)" : "none",
        opacity: dimmed ? 0.4 : 1,
      }}
    >
      <span
        className="size-9 shrink-0 rounded-full overflow-hidden"
        style={{
          border: "1px solid var(--ink)",
          background: "var(--paper)",
        }}
      >
        {imageSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt="" className="w-full h-full object-cover" />
        )}
      </span>
      <span
        className="display text-[0.95rem] tracking-tight leading-[1]"
        style={{
          color: selected ? "var(--ink)" : "var(--ink-soft)",
        }}
      >
        {item.name ?? "—"}
      </span>
    </button>
  );
}

function messageFor(error: string | undefined): string {
  switch (error) {
    case "model_not_ready":
      return "O ilustrador está preparando os pincéis. Aguarde uns segundos e tente de novo.";
    case "image_server_unreachable":
      return "Não consigo falar com o ilustrador agora.";
    case "timeout":
      return "A primeira ilustração demora um pouquinho — tenta de novo daqui a pouco.";
    case "no_character_slots":
      return "Escolhe ao menos um personagem.";
    case "setting_not_found":
    case "character_not_found":
    case "object_not_found":
      return "Algum personagem, objeto ou cenário sumiu. Recarrega a página?";
    default:
      return "Algo prendeu o pincel. Tenta de novo?";
  }
}
