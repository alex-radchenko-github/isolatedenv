"use client";

import { useEffect } from "react";
import { Center, Text } from "@mantine/core";
import { ROUTES } from "@/lib/routes";

/**
 * Auth refresh page — with OIDC, token refresh is handled server-side.
 * This page simply checks if the session is still valid and redirects.
 */
export default function AuthRefreshPage() {
  useEffect(() => {
    let cancelled = false;

    async function attemptRefresh() {
      try {
        const res = await fetch("/api/auth/session", { credentials: "same-origin" });
        if (res.ok && !cancelled) {
          window.location.replace(ROUTES.DASHBOARD);
        } else if (!cancelled) {
          window.location.replace(ROUTES.AUTH_AUTHORIZE);
        }
      } catch {
        if (!cancelled) window.location.replace(ROUTES.AUTH_AUTHORIZE);
      }
    }

    attemptRefresh();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Center mih="100vh">
      <Text c="dimmed">Refreshing session...</Text>
    </Center>
  );
}
