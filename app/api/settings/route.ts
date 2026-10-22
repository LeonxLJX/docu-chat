import { NextRequest } from "next/server";
import { requireAuth, isLicensed } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/db";
import { jsonParseSafe, fail, ok } from "@/lib/http";

const PERSIST_KEYS = [
  "openai_api_key",
  "chat_model",
  "system_prompt",
  "widget_title",
  "widget_welcome",
  "widget_placeholder",
  "widget_theme",
  "widget_brand_color",
  "license_key",
  "license_verified",
];

export async function GET() {
  try {
    requireAuth();
    const out: Record<string, string | null | boolean> = {};
    for (const k of PERSIST_KEYS) {
      const v = getSetting(k);
      // Never echo back API keys — only a "configured" flag
      if (k === "openai_api_key") {
        out.openai_api_key = v ? `${v.slice(0, 8)}...${v.slice(-4)}` : null;
        out.openai_configured = Boolean(v);
      } else if (k === "license_verified") {
        out.license_verified = v === "true";
      } else {
        out[k] = v;
      }
    }
    out.is_licensed = isLicensed();
    return ok(out);
  } catch (e: any) {
    return fail(e.message, e.status ?? 401);
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAuth();
    const body = await jsonParseSafe(req);

    // Whitelist what can be saved
    for (const k of Object.keys(body)) {
      if (!PERSIST_KEYS.includes(k)) continue;
      const val = body[k];
      if (val === undefined || val === null) continue;
      if (k === "license_verified") continue; // only set by license verify endpoint
      setSetting(k, String(val));
    }
    return ok({ saved: true });
  } catch (e: any) {
    return fail(e.message, e.status ?? 500);
  }
}
