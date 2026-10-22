import { NextRequest, NextResponse } from "next/server";
import { bootstrapAdminIfNeeded, createSession, verifyPassword, setSessionCookie } from "@/lib/auth";
import db from "@/lib/db";
import { jsonParseSafe, ok, fail } from "@/lib/http";

export async function POST(req: NextRequest) {
  try {
    await bootstrapAdminIfNeeded();
    const body = await jsonParseSafe(req);
    const { email, password } = body;
    if (!email || !password) return fail("email and password required");

    const row = db.prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email) as
      | { id: number; password_hash: string }
      | undefined;
    if (!row) return fail("invalid credentials", 401);

    const ok2 = await verifyPassword(password, row.password_hash);
    if (!ok2) return fail("invalid credentials", 401);

    const sessionId = await createSession(row.id);
    setSessionCookie(sessionId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return fail(e.message ?? "login failed", 500);
  }
}
