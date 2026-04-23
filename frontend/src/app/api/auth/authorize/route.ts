/**
 * GET /api/auth/authorize
 *
 * Generates OIDC state + PKCE code_verifier, sets httpOnly cookies,
 * and redirects to Authentik. This is the single entry point for initiating OIDC login.
 */
import { NextResponse } from "next/server";
import { generateCodeVerifier, computeCodeChallenge } from "@/lib/auth-server";
import { getServerEnv } from "@/lib/env";

function getOrigin(): string {
  return process.env.APP_ORIGIN ?? `http://localhost:${process.env.PORT ?? 3000}`;
}

export async function GET(): Promise<NextResponse> {
  const state = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = computeCodeChallenge(codeVerifier);

  const { AUTHENTIK_URL, AUTHENTIK_CLIENT_ID } = getServerEnv();

  const origin = getOrigin();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: AUTHENTIK_CLIENT_ID,
    redirect_uri: `${origin}/api/auth/callback`,
    scope: "openid email profile groups",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  // Authentik authorize URL uses the external URL (browser-facing)
  const externalAuthentikUrl = process.env.NEXT_PUBLIC_AUTHENTIK_URL ?? AUTHENTIK_URL;

  const isProduction = process.env.NODE_ENV === "production";

  const response = NextResponse.redirect(
    `${externalAuthentikUrl}/application/o/authorize/?${params}`,
  );

  response.cookies.set("oauth_state", state, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: isProduction,
    maxAge: 300,
  });

  response.cookies.set("code_verifier", codeVerifier, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: isProduction,
    maxAge: 300,
  });

  return response;
}
