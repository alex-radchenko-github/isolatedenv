import "server-only";

import { ApiError } from "@/lib/api-client";
import { clearSessionCookies } from "@/lib/auth-server";

export async function withAuth<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await clearSessionCookies();
      throw new Error("UNAUTHORIZED");
    }
    if (error instanceof ApiError && error.status === 403) {
      // Distinguish blocked account (clear session) from insufficient role (keep session).
      // Backend returns "Account is blocked" for deactivated users,
      // and "Role '...' is not allowed" for role-based denial.
      if (error.message.toLowerCase().includes("blocked")) {
        await clearSessionCookies();
        throw new Error("BLOCKED");
      }
      throw new Error("FORBIDDEN");
    }
    throw error;
  }
}
