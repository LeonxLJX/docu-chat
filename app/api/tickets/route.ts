import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonParseSafe, fail, ok } from "@/lib/http";
import { v4 as uuidv4 } from "uuid";
import db from "@/lib/db";

/**
 * GET  /api/tickets          → admin: list all
 * POST /api/tickets          → public (widget creates a "talk-to-human" ticket)
 */

export async function GET(req: NextRequest) {
  try {
    requireAuth();
    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // open | resolved | null
    const where = status ? "WHERE status = ?" : "";
    const rows = db
      .prepare(`SELECT * FROM tickets ${where} ORDER BY created_at DESC`)
      .all(...(status ? [status] : []));
    return ok(rows);
  } catch (e: any) {
    return fail(e.message, e.status ?? 401);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await jsonParseSafe(req);
    const subject = (body.subject ?? "Need human help").toString().trim().slice(0, 200);
    const message = (body.message ?? "").toString().trim();
    const visitorId = body.visitorId ? String(body.visitorId).slice(0, 128) : null;
    const contactEmail = body.contactEmail
      ? String(body.contactEmail).trim().slice(0, 200)
      : null;

    if (!message) return fail("message is required");

    const id = uuidv4();
    db.prepare(
      `INSERT INTO tickets (id, visitor_id, contact_email, subject, message)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, visitorId, contactEmail, subject, message);

    return ok({ id, status: "open" });
  } catch (e: any) {
    return fail(e.message, 500);
  }
}
