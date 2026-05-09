"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "student" | "teacher" | "parent" | "admin";
type Template = {
  key: string;
  emoji: string;
  label: string;
  hint: string;
  // Pre-filled name (placeholder for the user to customize).
  name: string;
  // Optional starter assignment to create alongside the class.
  starter?: {
    title: string;
    prompt: string;
    lessonType: "essay" | "junior_books";
  };
};

const TEACHER_TEMPLATES: Template[] = [
  {
    key: "elem_class",
    emoji: "📚",
    label: "Sala de aula (fundamental)",
    hint: "ex: 5º ano A. ideal pra Junior — livros animados.",
    name: "5º ano A",
    starter: {
      title: "Crie um livro: 'Uma viagem inesperada'",
      prompt:
        "Imagine que você abre uma porta no quintal e encontra um lugar que ninguém conhece. Quem mora lá? Que objeto vive lá? Conte essa história em 4 cenas.",
      lessonType: "junior_books",
    },
  },
  {
    key: "literatura",
    emoji: "✍️",
    label: "Literatura / Redação",
    hint: "redação dissertativa com tutoria por chat",
    name: "Redação 9º ano",
    starter: {
      title: "Redação: tecnologia e educação",
      prompt:
        "Apresente uma tese sobre o impacto da IA na aprendizagem. Use ao menos um argumento de evidência e contraponha uma objeção.",
      lessonType: "essay",
    },
  },
  {
    key: "historia",
    emoji: "🌍",
    label: "História / Geografia",
    hint: "narrativas históricas viram livros animados",
    name: "História 7º ano",
    starter: {
      title: "Crie um livro sobre o Brasil colonial",
      prompt:
        "Conte essa história pela visão de uma criança que viveu no período. Crie 1 personagem central, 1 cenário e 3 cenas.",
      lessonType: "junior_books",
    },
  },
  {
    key: "reforco",
    emoji: "🌱",
    label: "Reforço / Contraturno",
    hint: "atividades extras pra um grupo menor",
    name: "Reforço de Português",
  },
  {
    key: "blank_t",
    emoji: "✦",
    label: "Em branco",
    hint: "sem modelo — eu escolho tudo",
    name: "",
  },
];

const PARENT_TEMPLATES: Template[] = [
  {
    key: "casa",
    emoji: "🏠",
    label: "Casa do(a) filho(a)",
    hint: "um grupo só pra um filho",
    name: "Casa do(a)",
  },
  {
    key: "ferias",
    emoji: "☀️",
    label: "Férias / Verão",
    hint: "atividades pra ocupar a cabeça nas férias",
    name: "Férias 2026",
    starter: {
      title: "Crie um livro: 'Aventuras das férias'",
      prompt:
        "Pode ser de verdade ou inventado. Quem aparece, onde acontece, o que descobrem juntos.",
      lessonType: "junior_books",
    },
  },
  {
    key: "licao",
    emoji: "📖",
    label: "Lição de casa",
    hint: "tarefas pequenas pra fazer todo dia",
    name: "Lição de casa",
  },
  {
    key: "irmaos",
    emoji: "👨‍👩‍👧‍👦",
    label: "Grupo dos irmãos",
    hint: "todos os filhos juntos",
    name: "Família",
  },
  {
    key: "blank_p",
    emoji: "✦",
    label: "Em branco",
    hint: "sem modelo — eu escolho tudo",
    name: "",
  },
];

export function NewClassForm({ role }: { role: Role }) {
  const router = useRouter();
  const isParent = role === "parent";
  const templates = isParent ? PARENT_TEMPLATES : TEACHER_TEMPLATES;

  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Template | null>(null);
  const [createStarter, setCreateStarter] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function pickTemplate(t: Template) {
    setPicked(t);
    if (t.name) setName(t.name);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/class/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Falha.");
      setLoading(false);
      return;
    }
    const { classId } = await res.json();

    // If template suggested a starter assignment and the user kept the toggle,
    // chain a second request. Failure here is non-fatal — class is already saved.
    if (picked?.starter && createStarter) {
      try {
        await fetch("/api/assignment/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classId,
            title: picked.starter.title,
            prompt: picked.starter.prompt,
            lessonType: picked.starter.lessonType,
            criteria: null,
            maxHints: 3,
            minInitialChars: picked.starter.lessonType === "essay" ? 200 : 0,
          }),
        });
      } catch {
        /* non-fatal */
      }
    }
    router.push(`/teacher/classes/${classId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Template chips */}
      <div className="flex flex-col gap-2">
        <Label>Comece com um modelo</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {templates.map((t) => {
            const selected = picked?.key === t.key;
            return (
              <button
                type="button"
                key={t.key}
                onClick={() => pickTemplate(t)}
                className="text-left p-3 rounded-[14px] border-2 transition-all hover:translate-y-[-1px]"
                style={{
                  background: selected ? "var(--paper)" : "transparent",
                  borderColor: selected ? "var(--magic)" : "var(--paper-edge)",
                  boxShadow: selected ? "0 0 0 3px rgba(14, 84, 76, 0.12)" : "none",
                }}
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-base shrink-0" aria-hidden>
                    {t.emoji}
                  </span>
                  <span
                    className="display tracking-tight text-[1rem]"
                    style={{ color: selected ? "var(--ink)" : "var(--ink-soft)" }}
                  >
                    {t.label}
                  </span>
                </div>
                <p className="body-serif italic text-[0.78rem] text-[var(--ink-faint)] mt-1 leading-snug">
                  {t.hint}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">
          {isParent ? "Nome do grupo" : "Nome da turma"}
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isParent ? "ex: Casa do Bruno" : "ex: 5º ano A"}
          required
          minLength={3}
        />
      </div>

      {picked?.starter && (
        <label
          className="flex items-start gap-2 p-3 rounded-[14px] cursor-pointer"
          style={{
            background: "var(--paper)",
            border: "1px solid var(--paper-edge)",
          }}
        >
          <input
            type="checkbox"
            checked={createStarter}
            onChange={(e) => setCreateStarter(e.target.checked)}
            className="mt-1"
          />
          <div>
            <p className="display tracking-tight text-[0.95rem] text-[var(--ink)]">
              criar a primeira tarefa junto:{" "}
              <span className="display-italic text-[var(--magic)]">
                {picked.starter.title}
              </span>
            </p>
            <p className="body-serif italic text-[0.78rem] text-[var(--ink-faint)] mt-1 leading-snug">
              {picked.starter.lessonType === "junior_books"
                ? "tipo: Andaime Junior · Book"
                : "tipo: Redação dissertativa"}
              . dá pra editar/apagar depois.
            </p>
          </div>
        </label>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading || name.trim().length < 3}>
        {loading
          ? "Criando..."
          : isParent
            ? "Criar grupo"
            : "Criar turma"}
      </Button>
    </form>
  );
}
