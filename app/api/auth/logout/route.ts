import { NextResponse } from "next/server";
import { clearSessionCookie, deleteSession, getSession } from "@/lib/auth";
import { ok } from "@/lib/http";

export async function POST() {
  const s = getSession();
  if (s) deleteSession(s.id);
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
