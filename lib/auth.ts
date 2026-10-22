import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import db, { getSetting, setSetting } from "./db";
import { randomBytes } from "crypto";

const SESSION_COOKIE = "docuchat_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export interface Session {
  id: string;
  userId: number;
  email: string;
  expiresAt: number;
}

function getSessions() {
  db.exec(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  )`);
  return db.prepare("SELECT * FROM sessions WHERE id = ? AND expires_at > ?");
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function bootstrapAdminIfNeeded() {
  const count = (db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c;
  if (count > 0) return;

  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "changeme";
  const hash = await hashPassword(password);
  db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)").run(email, hash);
  console.log(`[auth] bootstrap admin user: ${email}`);
}

export async function createSession(userId: number): Promise<string> {
  const id = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(id, userId, expiresAt);
  return id;
}

export function deleteSession(id: string) {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

export function getSession(): Session | null {
  const sessionId = cookies().get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const row = db
    .prepare(
      `SELECT s.id, s.expires_at, u.id AS user_id, u.email
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > ?`
    )
    .get(sessionId) as
    | { id: string; expires_at: number; user_id: number; email: string }
    | undefined;

  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    expiresAt: row.expires_at,
  };
}

export function setSessionCookie(sessionId: string) {
  cookies().set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

export function requireAuth(): Session {
  const s = getSession();
  if (!s) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return s;
}

// Convenience: check license status from settings table
export function isLicensed(): boolean {
  return getSetting("license_verified") === "true";
}

export function requireLicenseOrBasic() {
  // Licensed users get full features; unlicensed can use the basics (no embed)
  return isLicensed();
}
