import { z } from "zod";

// Tiny zod-free validator (avoid pulling zod just for this)
export function validate<T extends Record<string, unknown>>(
  body: unknown,
  schema: Partial<Record<keyof T, "string" | "number" | "boolean" | "object" | "array">>
): T {
  if (typeof body !== "object" || body === null) throw new Error("body must be JSON object");
  const out: any = {};
  for (const [key, type] of Object.entries(schema)) {
    const v = (body as any)[key];
    if (v === undefined) continue;
    const actual = Array.isArray(v) ? "array" : typeof v;
    if (actual !== type) throw new Error(`${key}: expected ${type}, got ${actual}`);
    out[key] = v;
  }
  return out as T;
}

export async function jsonParseSafe(req: Request): Promise<any> {
  const text = await req.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("invalid JSON");
  }
}

export function ok<T>(data?: T, status = 200) {
  return new Response(data === undefined ? null : JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function fail(message: string, status = 400, extra?: any) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { "content-type": "application/json" },
  });
}
