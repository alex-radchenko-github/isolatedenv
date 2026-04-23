/**
 * Next.js 16+ proxy (replaces middleware.ts).
 * Protects dashboard routes — redirects to Authentik if no session.
 * Sets nonce-based CSP headers on every request.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const DASHBOARD = "/dashboard";
const AUTH_AUTHORIZE = "/api/auth/authorize";
const isDev = process.env.NODE_ENV === "development";

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${process.env.NEXT_PUBLIC_AUTHENTIK_URL ?? "http://localhost:9010"} ${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${isDev ? " ws://localhost:3000 ws://localhost:3001" : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  const path = request.nextUrl.pathname;

  // Note: proxy checks exp only (no signature verification). Backend validates full JWT.
  // This is a UX optimization to redirect expired sessions early, not a security boundary.
  if (path.startsWith(DASHBOARD)) {
    if (!token) {
      return Response.redirect(new URL(AUTH_AUTHORIZE, request.url));
    }
    try {
      const [, b64] = token.split(".");
      const payload = JSON.parse(Buffer.from(b64, "base64url").toString());
      if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
        return Response.redirect(new URL(AUTH_AUTHORIZE, request.url));
      }
    } catch {
      return Response.redirect(new URL(AUTH_AUTHORIZE, request.url));
    }
  }

  // Generate per-request nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Security headers
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );

  // Prevent bfcache on protected routes
  if (path.startsWith(DASHBOARD)) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate",
    );
    response.headers.set("Pragma", "no-cache");
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
