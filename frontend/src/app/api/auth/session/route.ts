/**
 * GET /api/auth/session
 *
 * Returns the current user session.
 * Auto-refreshes expired access tokens via refresh_token grant (oauth4webapi).
 * Single source of truth: delegates to auth-server.ts getSession().
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: session.user,
  });
}
