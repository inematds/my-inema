"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewAssignmentForm({ classId }: { classId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [criteria, setCriteria] = useState("");
  const [maxHints, setMaxHints] = useState(3);
  const [minInitialChars, setMinInitialChars] = useState(200);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/assignment/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        title: title.trim(),
        prompt: prompt.trim(),
        criteria: criteria.trim() || null,
        maxHints,
        minInitialChars,
      }),
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Redação dissertativa: tecnologia e educação"
          required
          minLength={5}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="prompt">Enunciado</Label>
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={6}
          placeholder="Apresente uma tese sobre o impacto da IA na aprendizagem..."
          required
          minLength={20}
        />
      </div>
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="self-start">
        {loading ? "Criando..." : "Criar tarefa"}
      </Button>
    </form>
  );
}
