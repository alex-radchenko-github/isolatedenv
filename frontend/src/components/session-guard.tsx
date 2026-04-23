/**
 * SessionGuard — re-validates session when a page is restored from bfcache.
 * The proxy already validates JWT presence and expiry on every request,
 * so no initial validation fetch is needed on mount.
 */
"use client";

import { useEffect } from "react";
import { ROUTES } from "@/lib/routes";

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Re-validate when page is restored from bfcache (back-button)
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        fetch("/api/auth/session", { credentials: "same-origin" })
          .then((res) => {
            if (!res.ok) window.location.replace(ROUTES.AUTH_AUTHORIZE);
          })
          .catch(() => window.location.replace(ROUTES.AUTH_AUTHORIZE));
      }
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return <>{children}</>;
}
