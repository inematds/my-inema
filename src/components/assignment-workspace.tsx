"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Assignment = {
  id: string;
  title: string;
  prompt: string;
  criteria: string | null;
  max_hints: number;
  min_initial_chars: number;
  class_id: string;
};

type Attempt = {
  id: string;
  status: string;
  autonomy_score: number | null;
} | null;

type Turn = {
  id: string;
  author: string;
  kind: string;
  content: string;
  created_at: string;
};

export function AssignmentWorkspace({
  assignment,
  attempt: initialAttempt,
  initialTurns,
}: {
  assignment: Assignment;
  attempt: Attempt;
  initialTurns: Turn[];
}) {
  const router = useRouter();
  const attempt = initialAttempt;
  const [turns, setTurns] = useState<Turn[]>(initialTurns);

  // Initial-attempt phase
  const [initialText, setInitialText] = useState("");
  const [initialError, setInitialError] = useState<string | null>(null);
  const [submittingInitial, setSubmittingInitial] = useState(false);

  // Chat phase
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Final phase
  const [finalText, setFinalText] = useState("");
  const [finalLoading, setFinalLoading] = useState(false);

  async function submitInitial() {
    setInitialError(null);
    if (initialText.trim().length < assignment.min_initial_chars) {
      setInitialError(
        `Escreva pelo menos ${assignment.min_initial_chars} caracteres antes de pedir ajuda.`,
      );
      return;
    }
    setSubmittingInitial(true);
    const res = await fetch("/api/attempt/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId: assignment.id, initial: initialText }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setInitialError(j.error ?? "Falha ao iniciar.");
      setSubmittingInitial(false);
      return;
    }
    setSubmittingInitial(false);
    router.refresh();
  }

  async function sendChat() {
    if (!attempt || !chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput("");
    const optimistic: Turn = {
      id: crypto.randomUUID(),
      author: "student",
      kind: "revision",
      content: text,
      created_at: new Date().toISOString(),
    };
    setTurns((prev) => [...prev, optimistic]);
    setChatLoading(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId: attempt.id, content: text }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setTurns((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          author: "ai",
          kind: "feedback",
          content: `(Erro: ${j.error ?? "indisponível"} — tente novamente.)`,
          created_at: new Date().toISOString(),
        },
      ]);
    } else {
      const { reply } = await res.json();
      setTurns((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          author: "ai",
          kind: "question",
          content: reply,
          created_at: new Date().toISOString(),
        },
      ]);
    }
    setChatLoading(false);
  }

  async function finalize() {
    if (!attempt || finalText.trim().length < 50) return;
    setFinalLoading(true);
    const res = await fetch("/api/attempt/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId: attempt.id, finalContent: finalText }),
    });
    setFinalLoading(false);
    if (res.ok) {
      router.refresh();
    }
  }

  const aiTurnCount = turns.filter((t) => t.author === "ai").length;
  const hintsLeft = Math.max(0, assignment.max_hints - aiTurnCount);
  const isSubmitted = attempt?.status === "submitted";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] max-w-7xl">
      {/* Left: Task statement */}
      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle className="text-lg">{assignment.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-medium mb-1">Enunciado</h3>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {assignment.prompt}
            </p>
          </div>
          {assignment.criteria && (
            <div>
              <h3 className="text-sm font-medium mb-1">Critérios</h3>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {assignment.criteria}
              </p>
            </div>
          )}
          <Separator />
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">
              mín. {assignment.min_initial_chars} caracteres iniciais
            </Badge>
            <Badge variant="outline">
              {hintsLeft} de {assignment.max_hints} pistas restantes
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Right: Workspace state machine */}
      <div className="flex flex-col gap-4">
        {!attempt && (
          <Card>
            <CardHeader>
              <CardTitle>1. Tente primeiro</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Antes de pedir ajuda à IA, escreva sua tentativa inicial. Pode estar incompleta — o importante é começar com seu próprio raciocínio.
              </p>
              <Textarea
                value={initialText}
                onChange={(e) => setInitialText(e.target.value)}
                placeholder="Comece a escrever..."
                rows={10}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {initialText.trim().length} / {assignment.min_initial_chars} caracteres
                </span>
              </div>
              {initialError && (
                <p className="text-sm text-destructive">{initialError}</p>
              )}
              <Button
                onClick={submitInitial}
                disabled={submittingInitial}
                className="self-start"
              >
                {submittingInitial ? "Enviando..." : "Submeter tentativa inicial"}
              </Button>
            </CardContent>
          </Card>
        )}

        {attempt && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>2. Diálogo com a IA</span>
                  {isSubmitted && (
                    <Badge>Entregue · autonomia {attempt.autonomy_score ?? "—"}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-2">
                  {turns.map((t) => (
                    <TurnBubble key={t.id} turn={t} />
                  ))}
                  {chatLoading && (
                    <div className="text-xs text-muted-foreground italic">
                      Andaime está pensando...
                    </div>
                  )}
                </div>
                {!isSubmitted && (
                  <>
                    <Textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Compartilhe sua revisão, dúvida ou raciocínio..."
                      rows={4}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          sendChat();
                        }
                      }}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Cmd/Ctrl + Enter para enviar
                      </span>
                      <Button
                        onClick={sendChat}
                        disabled={chatLoading || !chatInput.trim() || hintsLeft === 0}
                      >
                        Enviar
                      </Button>
                    </div>
                    {hintsLeft === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Limite de pistas atingido. Você pode finalizar a tarefa abaixo.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {!isSubmitted && (
              <Card>
                <CardHeader>
                  <CardTitle>3. Versão final</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">
                    Quando estiver pronto, escreva sua versão final consolidada. Esta é a entrega.
                  </p>
                  <Textarea
                    value={finalText}
                    onChange={(e) => setFinalText(e.target.value)}
                    placeholder="Sua versão final..."
                    rows={8}
                  />
                  <Button
                    onClick={finalize}
                    disabled={finalLoading || finalText.trim().length < 50}
                    className="self-start"
                  >
                    {finalLoading ? "Finalizando..." : "Entregar versão final"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TurnBubble({ turn }: { turn: Turn }) {
  const isStudent = turn.author === "student";
  return (
    <div className={`flex ${isStudent ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          isStudent
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {turn.kind === "initial" && (
          <div className="text-xs uppercase tracking-wide opacity-70 mb-1">
            Tentativa inicial
          </div>
        )}
        {turn.kind === "final" && (
          <div className="text-xs uppercase tracking-wide opacity-70 mb-1">
            Versão final
          </div>
        )}
        {turn.content}
      </div>
    </div>
  );
}
