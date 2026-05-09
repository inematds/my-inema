import { getAnthropic } from "@/lib/ai/anthropic";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_CAPTION_MODEL || "qwen2.5:14b";
const ANTHROPIC_MODEL = "claude-haiku-4-5";

// "ollama" by default — no external API key needed. Set
// JUNIOR_CAPTION_PROVIDER=anthropic to use Claude haiku instead.
const PROVIDER = (process.env.JUNIOR_CAPTION_PROVIDER || "ollama").toLowerCase();

export type CaptionKind = "character" | "setting" | "scene" | "object";

export type Caption = {
  name: string | null;
  epithet: string | null;
};

const SYSTEM_PROMPTS: Record<CaptionKind, string> = {
  character: `Você dá um nome próprio e um epíteto para personagens criados por crianças de 8 a 12 anos.

Você recebe uma descrição em português e devolve EXATAMENTE um JSON, nada mais:
{"name": "<nome próprio curto>", "epithet": "<frase poética curta, 3 a 7 palavras, em português>"}

Regras DURAS — leia com atenção:
- O nome é UM nome próprio (1 a 2 palavras). Pode ser inventado ou comum, mas SEMPRE soa como nome de pessoa/criatura. Nunca repete a descrição.
- O epíteto é uma frase no padrão "o/a <substantivo> que <faz/é>" ou "<substantivo> de <complemento>". Curta, evocativa, sem clichê.
- TUDO em português brasileiro com palavras REAIS. Nada de "faimento", "resfofregado" ou inventar palavras. Se não souber a palavra exata em pt-BR, use uma palavra simples e correta.
- Sem emoji. Sem aspas dentro dos valores. Sem reticências. Sem maiúsculas decorativas no meio do epíteto.
- Se a descrição for ofensiva, abusiva ou inapropriada para criança, devolva {"name": null, "epithet": null}.

Exemplos certos:
descrição: "um lobo cinza de olhos âmbar que carrega uma pena de coruja no bolso"
{"name": "Théo", "epithet": "o lobo que guarda penas no bolso"}

descrição: "uma menina pequena com um capuz vermelho que sempre está com fome"
{"name": "Inê", "epithet": "a menina de capuz que tem sempre fome"}

descrição: "um robô feito de talheres velhos que tem medo de ímãs"
{"name": "Garfo", "epithet": "o robô feito de talheres com medo de ímãs"}

Exemplos ERRADOS (não faça assim):
{"name": "Mariazinha", "epithet": "do Capuz Vermelho Faimento"}  ← "Faimento" não existe
{"name": "Sala dos Tiques", "epithet": "Tempo Resfofregado"}     ← "Resfofregado" não existe`,

  setting: `Você dá um nome poético e um epíteto a CENÁRIOS (lugares, ambientes) criados por crianças de 8 a 12 anos.

Você recebe uma descrição em português e devolve EXATAMENTE um JSON, nada mais:
{"name": "<nome do lugar, curto e evocativo>", "epithet": "<frase poética curta, 3 a 7 palavras>"}

Regras DURAS — leia com atenção:
- O nome é o nome do LUGAR (não de pessoa). Pode ser inventado ("Bosque das Penas", "Vila do Relógio Quebrado") ou simples ("a cozinha da vó"). 1 a 4 palavras.
- O epíteto é uma frase que dá personalidade ao lugar, padrão "o/a <substantivo> onde <algo acontece/é>". Curta, evocativa.
- TUDO em português brasileiro com palavras REAIS. Nada de palavras inventadas. Se não souber a palavra exata, use uma simples e correta.
- Sem emoji. Sem aspas dentro dos valores. Sem reticências.
- Se a descrição for ofensiva, abusiva ou inapropriada, devolva {"name": null, "epithet": null}.

Exemplos certos:
descrição: "uma floresta escura com árvores de tronco prateado onde a lua sempre aparece"
{"name": "Mata-de-Prata", "epithet": "o bosque onde a lua nunca dorme"}

descrição: "a sala da casa da minha avó que tem um relógio velho que faz tic tac alto"
{"name": "Sala da Vó", "epithet": "o lugar onde o tempo fala alto"}`,

  scene: `Você dá um título e uma legenda curta para CENAS de uma história criada por crianças de 8 a 12 anos.

Você recebe uma descrição em português do que acontece e devolve EXATAMENTE um JSON, nada mais:
{"name": "<título da cena, curto e evocativo>", "epithet": "<legenda curta, 3 a 7 palavras, em pt-BR>"}

Regras DURAS:
- "name" é como um título de capítulo — 2 a 5 palavras. Substantivos e artigos, sem verbos longos. Ex.: "A Primeira Fuga", "O Encontro na Mata".
- "epithet" descreve o coração do momento. Frase curta, em pt-BR. Sem repetir o nome.
- TUDO em palavras pt-BR REAIS. Sem palavras inventadas. Sem emoji. Sem aspas dentro dos valores.
- Se a descrição for inapropriada, devolva {"name": null, "epithet": null}.

Exemplos certos:
descrição: "o lobo encontra a coruja na floresta de noite e descobre que ela tinha a pena que ele guarda"
{"name": "O Encontro Sob a Lua", "epithet": "o lobo descobre de quem é a pena"}

descrição: "a menina de capuz acha um caminho secreto na sala da vó atrás do relógio"
{"name": "O Caminho Atrás do Relógio", "epithet": "a sala guardava uma porta escondida"}`,

  object: `Você dá um nome próprio e um epíteto a OBJETOS (coisas — carros, colares, livros, espadas, instrumentos) inventados por crianças de 8 a 12 anos. Trate o objeto como se fosse uma personagem silenciosa: ele tem identidade própria.

Você recebe uma descrição em português e devolve EXATAMENTE um JSON, nada mais:
{"name": "<nome do objeto, curto e evocativo>", "epithet": "<frase poética curta, 3 a 7 palavras>"}

Regras DURAS — leia com atenção:
- O nome é o nome do OBJETO (não de pessoa nem de lugar). Pode ser inventado ("O Colar das Estrelas", "Espelho Quebrado") ou descritivo ("A Espada de Vidro"). 1 a 4 palavras.
- O epíteto sugere função, origem ou poder mágico do objeto. Padrão "guarda <algo>", "corta apenas <algo>", "leva quem <faz algo>", "lembra <algo>". Curta, evocativa.
- TUDO em português brasileiro com palavras REAIS. Nada de palavras inventadas. Sem emoji. Sem aspas dentro dos valores.
- Se a descrição for ofensiva, abusiva ou inapropriada, devolva {"name": null, "epithet": null}.

Exemplos certos:
descrição: "um colar com pingentes de vidro azul que a vó deixou de herança"
{"name": "O Colar das Estrelas", "epithet": "guarda os sonhos da avó"}

descrição: "uma espada feita de pedaços de espelho que reflete a verdade"
{"name": "Espelho Quebrado", "epithet": "corta apenas o que é mentira"}

descrição: "um carro verde antigo com cheiro de lavanda que sempre acha o caminho"
{"name": "O Carro de Lavanda", "epithet": "leva quem está triste pra casa"}`,
};

export async function generateCaption(
  kind: CaptionKind,
  description: string,
): Promise<Caption> {
  if (PROVIDER === "anthropic") return generateViaAnthropic(kind, description);
  return generateViaOllama(kind, description);
}

async function generateViaOllama(
  kind: CaptionKind,
  description: string,
): Promise<Caption> {
  const r = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[kind] },
        { role: "user", content: `descrição: "${description.replace(/"/g, "'")}"` },
      ],
      stream: false,
      format: "json",
      options: { temperature: 0.7, num_predict: 120 },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!r.ok) return { name: null, epithet: null };
  const j = (await r.json()) as { message?: { content?: string } };
  return parseCaptionJson(j.message?.content ?? "");
}

async function generateViaAnthropic(
  kind: CaptionKind,
  description: string,
): Promise<Caption> {
  const client = getAnthropic();
  const r = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 150,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPTS[kind],
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `descrição: "${description.replace(/"/g, "'")}"`,
      },
    ],
  });
  const text = r.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();
  return parseCaptionJson(text);
}

function parseCaptionJson(text: string): Caption {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return { name: null, epithet: null };
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as Caption;
    return {
      name: typeof parsed.name === "string" ? parsed.name.trim() : null,
      epithet: typeof parsed.epithet === "string" ? parsed.epithet.trim() : null,
    };
  } catch {
    return { name: null, epithet: null };
  }
}
