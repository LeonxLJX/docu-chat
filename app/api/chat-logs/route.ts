import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";
import { fail, ok } from "@/lib/http";

export async function GET(req: NextRequest) {
  try {
    requireAuth();
    const url = new URL(req.url);
    const limit = Math.min(500, Number(url.searchParams.get("limit") ?? 100));
    const rows = db
      .prepare("SELECT * FROM chat_logs ORDER BY created_at DESC LIMIT ?")
      .all(limit);
    return ok(rows);
  } catch (e: any) {
    return fail(e.message, e.status ?? 401);
  }
}
