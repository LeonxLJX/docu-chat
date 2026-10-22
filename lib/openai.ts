import OpenAI from "openai";
import { getSetting } from "./db";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (client) return client;
  const apiKey = getSetting("openai_api_key") || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured. Set it in Settings.");
  client = new OpenAI({ apiKey });
  return client;
}

export async function embedTexts(
  texts: string[],
  model = "text-embedding-3-small"
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const openai = getOpenAIClient();
  const resp = await openai.embeddings.create({ model, input: texts });
  return resp.data.map((d) => d.embedding);
}

export function setClientForTest(c: OpenAI | null) {
  client = c;
}

export function resetClient() {
  client = null;
}
