"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserRole } from "@/types/user";

interface SessionUser {
  sub: string;
  email: string;
  name: string;
  groups: string[];
}

interface SessionData {
  authenticated: boolean;
  user?: SessionUser;
}

/**
 * Derive role from Authentik groups.
 * Group "admins" → admin, "paid" → paid, else free.
 */
function deriveRole(groups: string[] | undefined): UserRole {
  if (!groups) return "free";
  if (groups.includes("admins")) return "admin";
  if (groups.includes("paid")) return "paid";
  return "free";
}

/**
 * Session hook — reads user info from the OIDC ID token (via /api/auth/session).
 * Does NOT call the backend API — works even when the backend is down.
 * Returns name, email, and role derived from Authentik groups.
 *
 * Role source of truth: JWT `groups` claim from Authentik.
 * The DB role (see useRole) is a cache that is synced on login.
 * Admin change_role updates Authentik first, then DB.
 */
export function useSession() {
  const query = useQuery<SessionData>({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session");
      if (!res.ok) return { authenticated: false };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const role = deriveRole(query.data?.user?.groups);

  return { ...query, role };
}
