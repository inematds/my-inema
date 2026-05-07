import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Add it to .env.local to enable AI tutoring.",
      );
    }
    client = new Anthropic({ apiKey: key });
  }
  return client;
}

export const ANDAIME_MODEL = "claude-sonnet-4-6";
