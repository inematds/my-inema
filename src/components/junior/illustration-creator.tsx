"use client";

import { useEffect, useRef, useState } from "react";
import type { JuniorItem } from "./workspace";

const MIN_CHARS = 40;

type Copy = {
  eyebrow: string;
  heading: React.ReactNode;
  intro: string;
  placeholder: string;
  tip: string;
  cta: string;
  ctaProgress: string;
  errorIntro: string;
};

const COPY: Record<"character" | "object" | "setting", Copy> = {
  character: {
    eyebrow: "ato 1 · personagens",
    heading: (
      <>
        Conta pra mim{" "}
        <span className="display-italic text-[var(--magic)]">quem ele é.</span>
      </>
    ),
    intro:
      "Quanto mais detalhe você der, mais o personagem ganha vida. Cada personagem que você cria entra no seu elenco lá em cima.",
    placeholder:
      'Ex.: "Um lobo cinza-prata de olhos âmbar que sempre carrega uma pena de coruja branca no bolso da capa porque..."',
    tip: "como ele se parece, como ele anda, o que ele guarda no bolso, do que ele tem medo...",
    cta: "fazer aparecer",
    ctaProgress: "desenhando...",
    errorIntro: "Algo prendeu o pincel.",
  },
  object: {
    eyebrow: "ato 2 · objetos",
    heading: (
      <>
        E essa coisa,{" "}
        <span className="display-italic text-[var(--magic)]">o que ela faz?</span>
      </>
    ),
    intro:
      "Objetos têm vida própria na sua história. Pode ser um colar mágico, uma espada, um carro velho, um livro proibido. Cada objeto que você cria entra na estante lá em cima.",
    placeholder:
      'Ex.: "Um colar com pingentes de vidro azul que a vó deixou de herança e que ilumina quando alguém está mentindo..."',
    tip: "do que é feito, qual a história dele, que poder tem, de quem foi antes de chegar aqui...",
    cta: "fazer aparecer",
    ctaProgress: "desenhando...",
    errorIntro: "Algo prendeu o pincel.",
  },
  setting: {
    eyebrow: "ato 3 · cenários",
    heading: (
      <>
        Onde a história{" "}
        <span className="display-italic text-[var(--magic)]">acontece?</span>
      </>
    ),
    intro:
      "Os lugares são tão personagens quanto os personagens. Cada cenário que você cria entra no seu mundo lá em cima.",
    placeholder:
      'Ex.: "Uma floresta escura com árvores de tronco prateado onde a lua sempre aparece..."',
    tip: "como é o céu, qual o cheiro, o que se ouve, qual a luz, o que existe que ninguém imaginaria...",
    cta: "fazer aparecer",
    ctaProgress: "desenhando...",
    errorIntro: "Algo prendeu o pincel.",
  },
};

export function IllustrationCreator({
  kind,
  endpoint,
  onCreate,
}: {
  kind: "character" | "object" | "setting";
  endpoint: string;
  onCreate: (item: JuniorItem) => void;
}) {
  const copy = COPY[kind];
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const submittingRef = useRef<AbortController | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => () => submittingRef.current?.abort(), []);

  async function submit() {
    const text = description.trim();
    if (text.length < MIN_CHARS) return;
    if (submittingRef.current) submittingRef.current.abort();
    const ctrl = new AbortController();
    submittingRef.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), 130_000);
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text }),
        signal: ctrl.signal,
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok) {
        setErrorMsg(messageFor(j.error, copy.errorIntro));
        return;
      }
      const item: JuniorItem | undefined = j.character ?? j.object ?? j.setting;
      if (!item) {
        setErrorMsg(`${copy.errorIntro} Tenta de novo?`);
        return;
      }
      onCreate(item);
      setDescription("");
      taRef.current?.focus();
    } catch (e) {
      const err = e as { name?: string };
      if (err?.name !== "AbortError") {
        setErrorMsg(`${copy.errorIntro} Tenta de novo?`);
      }
    } finally {
      clearTimeout(timer);
      if (submittingRef.current === ctrl) submittingRef.current = null;
      setSubmitting(false);
    }
  }

  const charCount = description.trim().length;
  const ready = charCount >= MIN_CHARS;
  const progress = Math.min(charCount / MIN_CHARS, 1);

  return (
    <section className="flex flex-col gap-5 max-w-[720px]">
      <p className="body-serif italic text-[0.85rem] tracking-wide text-[var(--ink-faint)]">
        {copy.eyebrow}
      </p>
      <h2 className="display text-[clamp(2rem,4.4vw,3.4rem)] leading-[0.95] text-[var(--ink)]">
        {copy.heading}
      </h2>
      <p className="body-serif text-[1rem] leading-[1.55] text-[var(--ink-soft)] max-w-[52ch]">
        {copy.intro}
      </p>

      <div className="paper-card rounded-[20px] p-5 mt-1">
        <textarea
          ref={taRef}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={copy.placeholder}
          rows={7}
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
                background: ready ? "var(--magic)" : "var(--amber-soft)",
              }}
            />
          </div>
          <span className="body-serif tabular-nums text-[0.85rem] text-[var(--ink-faint)] shrink-0">
            {charCount}
            <span className="opacity-60"> / {MIN_CHARS}+</span>
          </span>
        </div>
      </div>

      <p className="body-serif italic text-[0.92rem] text-[var(--ink-faint)] -mt-1">
        tip:{" "}
        <span className="text-[var(--ink-soft)] not-italic">{copy.tip}</span>
      </p>

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
          disabled={!ready || submitting}
          className="body-serif text-[0.95rem] tracking-[0.02em] px-5 py-2.5 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:translate-y-[-1px] active:translate-y-0"
          style={{
            background: "var(--ink)",
            color: "var(--paper)",
            boxShadow: "0 8px 20px -10px rgba(29,25,22,0.4)",
          }}
        >
          {submitting ? copy.ctaProgress : copy.cta}
        </button>
        {submitting && (
          <span className="body-serif italic text-[0.9rem] text-[var(--ink-faint)] flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[var(--magic)] animate-pulse" />
            o ilustrador está pintando...
          </span>
        )}
      </div>
    </section>
  );
}

function messageFor(error: string | undefined, intro: string): string {
  switch (error) {
    case "model_not_ready":
      return "O ilustrador está preparando os pincéis. Aguarde uns segundos e tente de novo.";
    case "image_server_unreachable":
      return "Não consigo falar com o ilustrador agora.";
    case "timeout":
      return "A primeira ilustração demora um pouquinho — tenta de novo daqui a pouco.";
    default:
      return `${intro} Tenta de novo?`;
  }
}
