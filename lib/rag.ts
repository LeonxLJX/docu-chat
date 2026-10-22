import OpenAI from "openai";
import { getOpenAIClient } from "./openai";
import { search } from "./vectorStore";
import { v4 as uuidv4 } from "uuid";
import db from "./db";
import { getSetting } from "./db";

export interface ChatResult {
  answer: string;
  sources: { documentId: string; content: string; score: number }[];
  chatId: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are a helpful customer support assistant for a digital product seller.
Answer the user's question using ONLY the provided context.
If the context doesn't contain enough information to answer confidently, say so — don't invent.
Keep answers concise, friendly, and actionable.
Cite sources briefly at the end when helpful.`;

export async function answerQuestion(
  question: string,
  opts: { visitorId?: string; topK?: number; model?: string; systemPrompt?: string } = {}
): Promise<ChatResult> {
  const topK = opts.topK ?? 5;
  const model = opts.model ?? getSetting("chat_model") ?? "gpt-4o-mini";
  const systemPrompt = opts.systemPrompt ?? getSetting("system_prompt") ?? DEFAULT_SYSTEM_PROMPT;

  const sources = await search(question, topK);
  const contextText = sources
    .map((s, i) => `[Source ${i + 1} | doc=${s.documentId}] ${s.content}`)
    .join("\n\n");

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Context:\n${contextText}\n\nQuestion: ${question}`,
    },
  ];

  const client = getOpenAIClient();
  const resp = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.2,
  });

  const answer = resp.choices[0]?.message?.content?.trim() ?? "Sorry, I couldn't generate a response.";
  const chatId = uuidv4();

  // Log
  db.prepare(
    "INSERT INTO chat_logs (id, visitor_id, question, answer, sources) VALUES (?, ?, ?, ?, ?)"
  ).run(
    chatId,
    opts.visitorId ?? null,
    question,
    answer,
    JSON.stringify(sources.map((s) => ({ chunkId: s.chunkId, documentId: s.documentId, score: s.score })))
  );

  return { answer, sources, chatId };
}
