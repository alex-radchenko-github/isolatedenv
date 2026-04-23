/**
 * GET /api/auth/callback?code=xxx&state=yyy
 *
 * Authentik redirects here after authentication.
 * Uses oauth4webapi to validate response, exchange code, set cookies.
 */
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, setSessionCookies } from "@/lib/auth-server";

function getOrigin(): string {
  return process.env.APP_ORIGIN ?? `http://localhost:${process.env.PORT ?? 3000}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = getOrigin();
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    const desc = request.nextUrl.searchParams.get("error_description") ?? error;
    console.error("[GET /api/auth/callback] Authentik error:", error, desc);
    return NextResponse.redirect(
      new URL(`/auth/error?reason=${encodeURIComponent(error)}`, origin),
    );
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;
  const codeVerifier = cookieStore.get("code_verifier")?.value;
  if (!savedState || !codeVerifier) {
    return NextResponse.redirect(
      new URL("/auth/error?reason=missing_state", origin),
    );
  }

  try {
    const redirectUri = `${origin}/api/auth/callback`;
    const callbackUrl = new URL(`${redirectUri}?${request.nextUrl.searchParams}`);
    const tokens = await exchangeCodeForTokens(callbackUrl, redirectUri, savedState, codeVerifier);
    await setSessionCookies(tokens);

    const response = NextResponse.redirect(new URL("/dashboard", origin));
    response.cookies.delete("oauth_state");
    response.cookies.delete("code_verifier");
    return response;
  } catch (err) {
    console.error("[GET /api/auth/callback] Token exchange failed:", err);
    return NextResponse.redirect(
      new URL("/auth/error?reason=token_exchange", origin),
    );
  }
}
