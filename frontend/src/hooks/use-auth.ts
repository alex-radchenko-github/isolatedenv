"use client";

import { getQueryClient } from "@/lib/query-client";

/**
 * Auth hook — OIDC redirect flow via /api/auth/authorize.
 *
 * Logout clears local cookies, ends the Authentik session via
 * end_session_endpoint (background fetch), then redirects to home.
 *
 * React Compiler handles memoization — no manual useCallback needed.
 */
export function useAuth() {
  function login() {
    window.location.href = "/api/auth/authorize";
  }

  async function logout() {
    getQueryClient().clear();

    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      const data = await res.json();

      if (data.logoutUrl) {
        // End Authentik session in a hidden iframe (browser sends Authentik cookies),
        // then redirect to our landing page.
        await new Promise<void>((resolve) => {
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.onload = () => {
            iframe.remove();
            resolve();
          };
          iframe.onerror = () => {
            iframe.remove();
            resolve();
          };
          document.body.appendChild(iframe);
          iframe.src = data.logoutUrl;
          // Fallback timeout in case load/error events don't fire
          setTimeout(() => {
            iframe.remove();
            resolve();
          }, 3000);
        });
      }
    } catch {
      // Best effort — cookies already cleared server-side
    }

    window.location.replace("/");
  }

  return { login, logout };
}
