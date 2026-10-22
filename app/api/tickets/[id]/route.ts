import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonParseSafe, fail, ok } from "@/lib/http";
import db from "@/lib/db";

/**
 * POST /api/tickets/:id/resolve  → admin marks ticket done
 * POST /api/tickets/:id/reopen   → admin re-opens
 */

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; action?: string } }
) {
  try {
    requireAuth();
    const body = await jsonParseSafe(_req);
    const action = (body.action ?? "resolve").toString(); // resolve | reopen

    if (action === "resolve") {
      const info = db
        .prepare(
          `UPDATE tickets SET status='resolved', resolved_at=datetime('now') WHERE id=?`
        )
        .run(params.id);
      if (info.changes === 0) return fail("not found", 404);
      return ok({ resolved: true });
    } else if (action === "reopen") {
      const info = db
        .prepare(`UPDATE tickets SET status='open', resolved_at=NULL WHERE id=?`)
        .run(params.id);
      if (info.changes === 0) return fail("not found", 404);
      return ok({ reopened: true });
    } else {
      return fail("unknown action");
    }
  } catch (e: any) {
    return fail(e.message, e.status ?? 500);
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth();
    const row = db.prepare("SELECT * FROM tickets WHERE id=?").get(params.id);
    if (!row) return fail("not found", 404);
    return ok(row);
  } catch (e: any) {
    return fail(e.message, e.status ?? 401);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth();
    const info = db.prepare("DELETE FROM tickets WHERE id=?").run(params.id);
    if (info.changes === 0) return fail("not found", 404);
    return ok({ deleted: params.id });
  } catch (e: any) {
    return fail(e.message, e.status ?? 401);
  }
}
