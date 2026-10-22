import { NextRequest } from "next/server";
import { answerQuestion } from "@/lib/rag";
import { jsonParseSafe, fail, ok } from "@/lib/http";
import { isLicensed } from "@/lib/auth";

/**
 * Public chat endpoint — used by the embedded widget.
 * No auth required; uses customer's own OpenAI key stored in settings.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await jsonParseSafe(req);
    const question = (body.question ?? "").toString().trim();
    if (!question) return fail("question is required");

    // Soft rate-limit-ish check via license (unlicensed = max 3 sources, just to be safe)
    const topK = isLicensed() ? 6 : 3;
    const result = await answerQuestion(question, {
      visitorId: body.visitorId ?? undefined,
      topK,
    });

    return ok({
      answer: result.answer,
      sources: result.sources.map((s) => ({ documentId: s.documentId, score: s.score })),
      chatId: result.chatId,
    });
  } catch (e: any) {
    return fail(e.message ?? "chat failed", 500);
  }
}

export async function GET() {
  // Health-ish ping — tells widget if the instance is ready
  return ok({ status: "ok", licensed: isLicensed() });
}
