/**
 * POST /api/auth/logout
 *
 * Clears local session cookies and returns the Authentik end_session URL.
 * The client redirects to that URL so Authentik destroys its own session,
 * preventing silent re-authentication.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookies, getLogoutUrl } from "@/lib/auth-server";

function getOrigin(): string {
  return process.env.APP_ORIGIN ?? `http://localhost:${process.env.PORT ?? 3000}`;
}

export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const idToken = cookieStore.get("id_token")?.value;

  await clearSessionCookies();

  const origin = getOrigin();

  // Always redirect to Authentik end_session — id_token_hint is optional.
  // Without it, Authentik shows a confirmation page but still ends the session.
  // Trailing slash is required — must match the registered redirect URI in Authentik.
  const logoutUrl = await getLogoutUrl(idToken ?? null, `${origin}/`);

  return NextResponse.json({ ok: true, logoutUrl });
}
