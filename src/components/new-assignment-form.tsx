"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type LessonType = "essay" | "junior_books" | "math_manim";

export function NewAssignmentForm({ classId }: { classId: string }) {
  const router = useRouter();
  const [lessonType, setLessonType] = useState<LessonType>("essay");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [criteria, setCriteria] = useState("");
  const [maxHints, setMaxHints] = useState(3);
  const [minInitialChars, setMinInitialChars] = useState(200);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  async function suggest() {
    if (suggesting) return;
    setSuggesting(true);
    setError(null);
    try {
      const r = await fetch("/api/assignment/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lessonType, hint: title.trim() }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? "Não consegui sugerir.");
        return;
      }
      if (j.title) setTitle(j.title);
      if (j.prompt) setPrompt(j.prompt);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const body: Record<string, unknown> = {
      classId,
      title: title.trim(),
      prompt: prompt.trim(),
      lessonType,
    };
    if (lessonType === "essay") {
      body.criteria = criteria.trim() || null;
      body.maxHints = maxHints;
      body.minInitialChars = minInitialChars;
    } else if (lessonType === "math_manim") {
      // Math: criteria is the expected answer (used by the auto-checker).
      body.criteria = criteria.trim() || null;
      body.maxHints = 3;
      body.minInitialChars = 0;
    } else {
      // junior_books
      body.criteria = null;
      body.maxHints = 3;
      body.minInitialChars = 0;
    }
    const res = await fetch("/api/assignment/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Falha.");
      setLoading(false);
      return;
    }
    router.push(`/teacher/classes/${classId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Lesson type picker */}
      <div className="flex flex-col gap-2">
        <Label>Tipo de aula</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TypeCard
            current={lessonType}
            value="essay"
            title="Redação dissertativa"
            desc="Aluno escreve com tutoria via chat. Tese, argumentos, autonomy_score."
            onPick={setLessonType}
          />
          <TypeCard
            current={lessonType}
            value="junior_books"
            title="Andaime Junior · Book"
            desc="Aluno cria personagens, cenas e um livro animado. Sem chat."
            onPick={setLessonType}
          />
          <TypeCard
            current={lessonType}
            value="math_manim"
            title="Math · Manim"
            desc="Aluno resolve um problema, mostra o raciocínio, recebe feedback socrático da IA. (animação Manim virá depois.)"
            onPick={setLessonType}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="title">Título</Label>
          <button
            type="button"
            onClick={suggest}
            disabled={suggesting}
            className="body-serif italic text-[0.82rem] px-3 py-1 rounded-full transition-all hover:translate-y-[-1px] disabled:opacity-50"
            style={{
              background: "transparent",
              border: "1px solid var(--magic)",
              color: "var(--magic)",
            }}
          >
            {suggesting ? "pensando..." : "✨ me dá uma ideia"}
          </button>
        </div>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            lessonType === "essay"
              ? "Redação: tecnologia e educação"
              : "Crie um livro: 'Uma viagem inesperada'"
          }
          required
          minLength={5}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="prompt">
          {lessonType === "essay"
            ? "Enunciado"
            : lessonType === "math_manim"
              ? "Problema"
              : "Briefing (opcional)"}
        </Label>
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={lessonType === "essay" ? 6 : 4}
          placeholder={
            lessonType === "essay"
              ? "Apresente uma tese sobre o impacto da IA na aprendizagem..."
              : lessonType === "math_manim"
                ? "ex: Resolva a equação 3x + 5 = 14. Mostre o passo-a-passo."
                : "Tema, dica, restrição que a turma toda vai usar. Pode deixar em branco."
          }
          required={lessonType !== "junior_books"}
          minLength={lessonType === "essay" ? 20 : lessonType === "math_manim" ? 10 : undefined}
        />
      </div>

      {lessonType === "math_manim" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="criteria">Resposta esperada</Label>
          <Input
            id="criteria"
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            placeholder="ex: x = 3, ou 42, ou 3/4"
            required
          />
          <p className="text-xs text-muted-foreground">
            confidencial — só serve pra checagem automática. o aluno nunca vê.
          </p>
        </div>
      )}

      {lessonType === "essay" && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="criteria">Critérios de avaliação (opcional)</Label>
            <Textarea
              id="criteria"
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              rows={4}
              placeholder="Tese clara, argumentos com evidência, conclusão consistente..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxHints">Máx. pistas da IA</Label>
              <Input
                id="maxHints"
                type="number"
                min={1}
                max={20}
                value={maxHints}
                onChange={(e) => setMaxHints(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="minChars">Mín. caracteres iniciais</Label>
              <Input
                id="minChars"
                type="number"
                min={50}
                max={2000}
                step={50}
                value={minInitialChars}
                onChange={(e) => setMinInitialChars(Number(e.target.value))}
              />
            </div>
          </div>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="self-start">
        {loading ? "Criando..." : "Criar tarefa"}
      </Button>
    </form>
  );
}

function TypeCard({
  current,
  value,
  title,
  desc,
  onPick,
}: {
  current: LessonType;
  value: LessonType;
  title: string;
  desc: string;
  onPick: (v: LessonType) => void;
}) {
  const selected = current === value;
  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      className={`text-left p-4 rounded-lg border-2 transition-all ${
        selected
          ? "border-primary bg-accent/30"
          : "border-border hover:border-foreground/40"
      }`}
    >
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </button>
  );
}
