// Heuristic pre-classifier: detects "give me the answer" patterns
// before paying for a full LLM call. Cheap, fast, deterministic.

const ANSWER_REQUEST_PATTERNS = [
  /\bme\s+d[áa]\s+(a\s+)?resposta\b/i,
  /\bqual\s+(é|e)\s+(a\s+)?resposta\b/i,
  /\bresponde?\s+(isso|pra\s+mim|por\s+mim)\b/i,
  /\bs[óo]\s+diz(er)?\b/i,
  /\bme\s+(diz|responde|fala)\b/i,
  /\bfaz\s+(isso|essa|a)\s+(pra\s+mim|por\s+mim)\b/i,
  /\bescreve?\s+a\s+(resposta|reda[çc][ãa]o|solu[çc][ãa]o)\b/i,
  /\bn[ãa]o\s+sei\s+nada\b/i,
  /\bqual\s+(é|e)\s+o\s+certo\b/i,
  /\bme\s+ajuda\s+(escrevendo|fazendo|respondendo)\b/i,
];

const STANDARD_REDIRECT = `Posso te ajudar a chegar lá, mas preciso ver onde você está. Compartilhe o que você já pensou — mesmo que esteja incompleto ou confuso. É a partir disso que vou te orientar.

Tente responder com suas palavras: o que você já entendeu sobre essa tarefa, e qual parte está mais nebulosa?`;

export function classifyAnswerRequest(text: string): {
  isAnswerRequest: boolean;
  redirect: string | null;
} {
  const trimmed = text.trim();

  // Very short messages that look like a give-up: also redirect.
  if (trimmed.length < 15 && /^(n[ãa]o sei|sei l[áa]|ajuda|socorro|h[mn]+)\b/i.test(trimmed)) {
    return { isAnswerRequest: true, redirect: STANDARD_REDIRECT };
  }

  for (const pattern of ANSWER_REQUEST_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isAnswerRequest: true, redirect: STANDARD_REDIRECT };
    }
  }

  return { isAnswerRequest: false, redirect: null };
}
