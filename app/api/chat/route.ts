import { NextRequest } from "next/server";
import { answerQuestion } from "@/lib/rag";
import { jsonParseSafe, fail, ok } from "@/lib/http";
import { isLicensed } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import db from "@/lib/db";

/**
 * Public chat endpoint — used by the embedded widget.
 * No auth required; uses customer's own OpenAI key stored in settings.
 *
 * Special behaviour: if the visitor asks for a human agent ("talk to human",
 * "contact support", "找人工", etc.) we create a ticket immediately and
 * reply with a friendly confirmation instead of running RAG.
 */

const HUMAN_KEYWORDS = [
  "human", "agent", "support", "live person", "real person",
  "operator", "staff", "talk to someone", "speak to someone",
  "找人工", "人工客服", "联系客服", "客服", "转人工",
];

function wantsHuman(text: string): boolean {
  const low = text.toLowerCase();
  return HUMAN_KEYWORDS.some((kw) => low.includes(kw)) ||
    /^(can i|please|pls)\s+(talk|speak)\s+(to|with)/i.test(text) ||
    text.trim().toLowerCase() === "help";
}

export async function POST(req: NextRequest) {
  try {
    const body = await jsonParseSafe(req);
    const question = (body.question ?? "").toString().trim();
    if (!question) return fail("question is required");

    // --- Talk-to-human shortcut ---
    if (wantsHuman(question)) {
      const visitorId = body.visitorId ? String(body.visitorId).slice(0, 128) : null;
      const ticketId = uuidv4();
      db.prepare(
        `INSERT INTO tickets (id, visitor_id, subject, message) VALUES (?, ?, ?, ?)`
      ).run(
        ticketId,
        visitorId,
        "Talk to human — from chat",
        question.slice(0, 2000)
      );
      return ok({
        answer:
          "Got it — I've passed this on to the team. They'll reach out by email as soon as possible. If this is urgent, tell me more and I'll try to help in the meantime!",
        sources: [],
        chatId: ticketId,
        ticketId,
        mode: "human",
      });
    }

    // --- Normal RAG path ---
    const topK = isLicensed() ? 6 : 3;
    const result = await answerQuestion(question, {
      visitorId: body.visitorId ?? undefined,
      topK,
    });

    return ok({
      answer: result.answer,
      sources: result.sources.map((s) => ({ documentId: s.documentId, score: s.score })),
      chatId: result.chatId,
      mode: "ai",
    });
  } catch (e: any) {
    return fail(e.message ?? "chat failed", 500);
  }
}

export async function GET() {
  // Health-ish ping — tells widget if the instance is ready
  return ok({ status: "ok", licensed: isLicensed() });
}
