import { NextRequest, NextResponse } from "next/server";

/**
 * CORS proxy-ish: allows widget.js on other origins to call /api/chat.
 * We don't use credentials, so simple Access-Control-Allow-Origin: * is fine.
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  if (url.pathname.startsWith("/api/chat")) {
    // Preflight
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "content-type",
        },
      });
    }
    const res = NextResponse.next();
    res.headers.set("Access-Control-Allow-Origin", "*");
    res.headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "content-type");
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/chat/:path*"],
};
