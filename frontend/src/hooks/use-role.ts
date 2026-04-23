"use client";

import { useUser } from "@/hooks/use-user";
import { hasRole } from "@/lib/rbac";
import type { UserRole } from "@/types/user";

/**
 * Role hook — derives role from the **database** via /api/v1/user/me (cached).
 * The DB role is a cache of the Authentik groups (source of truth).
 * For the JWT-based (source of truth) role, see useSession().
 * Admin change_role updates Authentik first, then DB.
 */
export function useRole() {
  const { data: user, isLoading, isError } = useUser();

  const role = user?.role ?? "free";
  const isAdmin = role === "admin";
  const isPaid = role === "paid" || role === "admin";

  return {
    role,
    isLoading,
    isError,
    isAdmin,
    isPaid,
    hasRole: (required: UserRole) => hasRole(role, required),
  };
}
