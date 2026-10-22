import { requireAuth, isLicensed } from "@/lib/auth";
import { getSetting } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { NextRequest } from "next/server";

/**
 * Returns the embed snippet that customers paste into Gumroad / their website.
 * Requires a verified license — this is the "paid feature" gate.
 */
export async function GET(req: NextRequest) {
  try {
    requireAuth();

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const origin = `${proto}://${host}`;

    if (!isLicensed()) {
      return fail(
        "Embed snippet is a licensed feature. Activate a $49 Lemon Squeezy license key in Settings first.",
        402
      );
    }

    const title = getSetting("widget_title") || "Need help? Ask here";
    const welcome = getSetting("widget_welcome") || "Hi! Ask me anything about the product.";
    const placeholder = getSetting("widget_placeholder") || "Type your question...";
    const theme = getSetting("widget_theme") || "light";
    const brandColor = getSetting("widget_brand_color") || "#2563eb";

    const embedSnippet = generateScriptSnippet(origin, {
      title,
      welcome,
      placeholder,
      theme,
      brandColor,
    });

    return ok({ embedSnippet, origin });
  } catch (e: any) {
    return fail(e.message, e.status ?? 401);
  }
}

interface WidgetConfig {
  title: string;
  welcome: string;
  placeholder: string;
  theme: string;
  brandColor: string;
}

function generateScriptSnippet(origin: string, cfg: WidgetConfig): string {
  const cfgJson = JSON.stringify({
    origin,
    title: cfg.title,
    welcome: cfg.welcome,
    placeholder: cfg.placeholder,
    theme: cfg.theme,
    brandColor: cfg.brandColor,
  });
  return `<!-- Docu-Chat AI Support Widget -->
<script>
  window.__DOCU_CHAT_CFG__ = ${cfgJson};
  (function(){
    var s=document.createElement('script');
    s.src='${origin}/widget.js';
    s.async=true;
    document.head.appendChild(s);
  })();
</script>
`;
}
