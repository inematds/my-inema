import { describe, it, expect } from "vitest";
import { classifyAnswerRequest } from "@/lib/ai/intent-classifier";

describe("classifyAnswerRequest", () => {
  it.each([
    "me dá a resposta",
    "qual é a resposta?",
    "responde isso pra mim",
    "só diz aí",
    "me diz qual é o certo",
    "faz isso pra mim",
    "escreve a redação",
    "não sei nada disso",
    "me ajuda escrevendo",
  ])("flags answer-request: %s", (msg) => {
    const r = classifyAnswerRequest(msg);
    expect(r.isAnswerRequest).toBe(true);
    expect(r.redirect).toBeTruthy();
  });

  it.each([
    "minha tese é que a IA pode prejudicar a aprendizagem porque encoraja cópia",
    "tentei argumentar que existe diferença entre uso ético e uso atalho",
    "estou em dúvida se a conclusão fecha a tese",
    "li dois artigos sobre o tema e quero comparar",
  ])("does not flag genuine reasoning: %s", (msg) => {
    const r = classifyAnswerRequest(msg);
    expect(r.isAnswerRequest).toBe(false);
    expect(r.redirect).toBeNull();
  });

  it("flags very short give-up messages", () => {
    expect(classifyAnswerRequest("não sei").isAnswerRequest).toBe(true);
    expect(classifyAnswerRequest("hmmm").isAnswerRequest).toBe(true);
    expect(classifyAnswerRequest("ajuda").isAnswerRequest).toBe(true);
  });
});
