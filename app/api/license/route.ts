import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { setSetting } from "@/lib/db";
import { verifyLicenseKey } from "@/lib/license";
import { jsonParseSafe, fail, ok } from "@/lib/http";

export async function POST(req: NextRequest) {
  try {
    requireAuth();
    const body = await jsonParseSafe(req);
    const key = (body.licenseKey ?? "").toString().trim();
    if (!key) return fail("licenseKey is required");

    const result = await verifyLicenseKey(key, {
      productId: process.env.LEMON_SQUEEZY_PRODUCT_ID,
    });

    if (result.valid) {
      setSetting("license_key", key);
      setSetting("license_verified", "true");
    } else {
      setSetting("license_verified", "false");
    }

    return ok({
      valid: result.valid,
      error: result.error,
      expiresAt: result.expiresAt ?? null,
    });
  } catch (e: any) {
    return fail(e.message, e.status ?? 500);
  }
}
