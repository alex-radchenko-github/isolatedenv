/**
 * Server-side OIDC utilities powered by oauth4webapi.
 * Handles token exchange, refresh, and session management via httpOnly cookies.
 *
 * This module must NEVER be imported in client components.
 */
import "server-only";

import * as oauth from "oauth4webapi";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { z } from "zod";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SessionData {
  accessToken: string;
  user: {
    sub: string;
    email: string;
    name: string;
    preferred_username: string;
    groups: string[];
    exp: number;
  };
}

// ── OIDC Discovery (cached) ──────────────────────────────────────────────────

let _as: oauth.AuthorizationServer | null = null;
let _asTimestamp = 0;
let _asRefreshPromise: Promise<oauth.AuthorizationServer> | null = null;
const AS_TTL_MS = 3_600_000; // 1 hour

async function getAuthServer(): Promise<oauth.AuthorizationServer> {
  if (_as && Date.now() - _asTimestamp < AS_TTL_MS) return _as;

  // Prevent thundering herd: only one concurrent discovery request
  if (_asRefreshPromise) return _asRefreshPromise;

  _asRefreshPromise = doDiscovery().finally(() => {
    _asRefreshPromise = null;
  });
  return _asRefreshPromise;
}

async function doDiscovery(): Promise<oauth.AuthorizationServer> {
  const issuerUrl = process.env.OIDC_ISSUER;
  if (!issuerUrl) throw new Error("Missing OIDC_ISSUER environment variable");
  const issuer = new URL(issuerUrl);

  try {
    const response = await oauth.discoveryRequest(issuer, {
      algorithm: "oidc",
      ...(process.env.NODE_ENV !== "production" ? { [oauth.allowInsecureRequests]: true } : {}),
    });
    _as = await oauth.processDiscoveryResponse(issuer, response);
    _asTimestamp = Date.now();
    return _as;
  } catch (err) {
    // Stale-while-revalidate: return cached value if available
    if (_as) return _as;
    throw err;
  }
}

function getClient(): oauth.Client {
  const clientId = process.env.AUTHENTIK_CLIENT_ID;
  if (!clientId) throw new Error("Missing AUTHENTIK_CLIENT_ID");
  return { client_id: clientId };
}

function getClientAuth(): oauth.ClientAuth {
  const clientSecret = process.env.AUTHENTIK_CLIENT_SECRET;
  if (!clientSecret) throw new Error("Missing AUTHENTIK_CLIENT_SECRET");
  return oauth.ClientSecretPost(clientSecret);
}

// ── JWT Decode (no verification — backend does JWKS) ─────────────────────────

const jwtPayloadSchema = z.object({
  sub: z.string(),
  email: z.string(),
  name: z.string().default(""),
  preferred_username: z.string().default(""),
  groups: z.array(z.string()).default([]),
  exp: z.number(),
});

function decodeJwtPayload(token: string): SessionData["user"] {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
  return jwtPayloadSchema.parse(JSON.parse(payload));
}

// ── PKCE Helpers ─────────────────────────────────────────────────────────────

/**
 * Generate a PKCE code_verifier (RFC 7636).
 * Returns a 43-character base64url-encoded random string.
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Compute S256 code_challenge from code_verifier (RFC 7636).
 */
export function computeCodeChallenge(codeVerifier: string): string {
  return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
}

// ── Token Operations ─────────────────────────────────────────────────────────

/**
 * Exchange authorization code for tokens.
 * callbackUrl: the full URL the browser was redirected to (with ?code=...&state=...).
 * expectedState: the state value from the httpOnly cookie.
 * codeVerifier: the PKCE code_verifier from the httpOnly cookie.
 */
export async function exchangeCodeForTokens(
  callbackUrl: URL,
  redirectUri: string,
  expectedState: string,
  codeVerifier: string,
): Promise<oauth.TokenEndpointResponse> {
  const as = await getAuthServer();
  const client = getClient();
  const clientAuth = getClientAuth();

  // Validate the auth response (extracts code, validates state)
  const params = oauth.validateAuthResponse(as, client, callbackUrl, expectedState);

  const response = await oauth.authorizationCodeGrantRequest(
    as,
    client,
    clientAuth,
    params,
    redirectUri,
    codeVerifier,
    ...(process.env.NODE_ENV !== "production" ? [{ [oauth.allowInsecureRequests]: true }] : []),
  );

  const result = await oauth.processAuthorizationCodeResponse(
    as,
    client,
    response,
  );

  return result;
}

/**
 * Refresh access token using refresh_token grant.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<oauth.TokenEndpointResponse> {
  const as = await getAuthServer();
  const client = getClient();
  const clientAuth = getClientAuth();

  const response = await oauth.refreshTokenGrantRequest(
    as,
    client,
    clientAuth,
    refreshToken,
    ...(process.env.NODE_ENV !== "production" ? [{ [oauth.allowInsecureRequests]: true }] : []),
  );

  return oauth.processRefreshTokenResponse(as, client, response);
}

// ── Session Management (httpOnly cookies) ────────────────────────────────────

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  priority: "high" as const,
};

/**
 * Store OIDC tokens in httpOnly cookies.
 */
export async function setSessionCookies(
  tokens: oauth.TokenEndpointResponse,
): Promise<void> {
  const cookieStore = await cookies();
  const expiresIn = tokens.expires_in ?? 3600;

  if (tokens.access_token) {
    cookieStore.set("session", tokens.access_token, {
      ...COOKIE_OPTIONS,
      maxAge: expiresIn,
    });
  }

  if (tokens.refresh_token) {
    cookieStore.set("refresh_token", tokens.refresh_token, {
      ...COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  }

  if (tokens.id_token) {
    cookieStore.set("id_token", tokens.id_token, {
      ...COOKIE_OPTIONS,
      maxAge: expiresIn,
    });
  }
}

/**
 * Clear all session cookies.
 */
export async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  cookieStore.delete("refresh_token");
  cookieStore.delete("id_token");
}

/**
 * Build Authentik end_session URL for proper OIDC logout.
 * Ends the Authentik session (not just local cookies) so the user
 * is not silently re-authenticated on the next visit.
 */
export async function getLogoutUrl(
  idToken: string | null,
  postLogoutRedirectUri: string,
): Promise<string> {
  try {
    const as = await getAuthServer();

    let endSessionEndpoint = as.end_session_endpoint;
    if (!endSessionEndpoint) {
      return postLogoutRedirectUri;
    }

    // OIDC discovery uses internal hostname (e.g. http://authentik-server:9000).
    // Replace with external hostname so the browser can reach it.
    const externalUrl = process.env.NEXT_PUBLIC_AUTHENTIK_URL;
    const internalUrl = process.env.AUTHENTIK_URL;
    if (
      externalUrl &&
      internalUrl &&
      endSessionEndpoint.startsWith(internalUrl)
    ) {
      endSessionEndpoint = endSessionEndpoint.replace(
        internalUrl,
        externalUrl,
      );
    }

    const params = new URLSearchParams({
      post_logout_redirect_uri: postLogoutRedirectUri,
    });
    if (idToken) {
      params.set("id_token_hint", idToken);
    }

    return `${endSessionEndpoint}?${params}`;
  } catch {
    return postLogoutRedirectUri;
  }
}

/**
 * Read current session from cookies.
 * Auto-refreshes if access token expired but refresh token exists.
 * Uses a singleton promise to prevent refresh token race conditions
 * (parallel SSR renders sharing the same refresh token).
 */
let _refreshSessionPromise: Promise<SessionData | null> | null = null;

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("session")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (accessToken) {
    try {
      const user = decodeJwtPayload(accessToken);
      const now = Math.floor(Date.now() / 1000);
      if (user.exp > now + 30) {
        return { accessToken, user };
      }
    } catch {
      // Token decode failed — try refresh
    }
  }

  if (refreshToken) {
    // Prevent race condition: only one concurrent refresh per process
    if (_refreshSessionPromise) return _refreshSessionPromise;

    _refreshSessionPromise = doRefreshSession(refreshToken).finally(() => {
      _refreshSessionPromise = null;
    });
    return _refreshSessionPromise;
  }

  return null;
}

async function doRefreshSession(
  refreshToken: string,
): Promise<SessionData | null> {
  try {
    const tokens = await refreshAccessToken(refreshToken);
    await setSessionCookies(tokens);
    const user = decodeJwtPayload(tokens.access_token);
    return { accessToken: tokens.access_token, user };
  } catch {
    await clearSessionCookies();
    return null;
  }
}
