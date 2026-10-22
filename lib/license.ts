/**
 * Verify a Lemon Squeezy license key via the official API.
 * Docs: https://docs.lemonsqueezy.com/api/license-keys/verify-a-license-key
 */

const LEMON_SQUEEZY_BASE = "https://api.lemonsqueezy.com/v1";

export interface LicenseCheckResult {
  valid: boolean;
  customerId?: string;
  customerEmail?: string;
  productId?: string;
  variantId?: string;
  expiresAt?: string | null;
  error?: string;
}

export async function verifyLicenseKey(
  licenseKey: string,
  opts: { productId?: string } = {}
): Promise<LicenseCheckResult> {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  if (!apiKey) {
    // No API key configured — run in "demo" mode. Treats non-empty keys as valid.
    // This lets devs test the flow without a Lemon Squeezy account.
    return {
      valid: licenseKey.trim().length >= 8,
      error: apiKey ? undefined : "LEMON_SQUEEZY_API_KEY not set (demo mode)",
    };
  }

  try {
    const resp = await fetch(`${LEMON_SQUEEZY_BASE}/licenses/verify`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        meta: {
          license_key: licenseKey.trim(),
          ...(opts.productId ? { product_id: opts.productId } : {}),
        },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return { valid: false, error: `HTTP ${resp.status}: ${text.slice(0, 200)}` };
    }

    const data = await resp.json();
    const attr = data?.data?.attributes ?? {};
    return {
      valid: Boolean(attr.valid),
      customerId: attr.customer_id,
      customerEmail: attr.customer_email,
      productId: attr.product_id,
      variantId: attr.variant_id,
      expiresAt: attr.expires_at,
      error: attr.valid ? undefined : "License key invalid or inactive",
    };
  } catch (e: any) {
    return { valid: false, error: e?.message ?? "Network error verifying license" };
  }
}
