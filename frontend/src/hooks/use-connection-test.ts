"use client";

import { useState } from "react";
import { fetchHealthStatus, fetchCeleryHealth } from "@/actions/health";

interface ServiceStatus {
  name: string;
  status: "ok" | "error" | "no-auth" | "loading";
  responseTime?: number;
  details?: Record<string, string>;
}

export function useConnectionTest() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [testing, setTesting] = useState(false);

  async function runTests() {
    setTesting(true);
    const results: ServiceStatus[] = [];

    // Test FastAPI Backend (via server action — internal endpoint)
    const backendStart = performance.now();
    try {
      const data = await fetchHealthStatus();
      const elapsed = Math.round(performance.now() - backendStart);
      results.push({
        name: "FastAPI Backend",
        status: data.status === "ok" ? "ok" : "error",
        responseTime: elapsed,
        details: {
          redis: data.redis || "unknown",
          database: data.database || "unknown",
          authentik: data.authentik || "unknown",
        },
      });
    } catch (err) {
      const elapsed = Math.round(performance.now() - backendStart);
      const isAuth = err instanceof Error && (err.message === "UNAUTHORIZED" || err.message === "BLOCKED");
      results.push({
        name: "FastAPI Backend",
        status: isAuth ? "no-auth" : "error",
        responseTime: elapsed,
      });
    }

    // Test Authentik availability (via session endpoint — checks OIDC connectivity)
    const authentikStart = performance.now();
    try {
      const res = await fetch("/api/auth/session", { credentials: "same-origin" });
      const elapsed = Math.round(performance.now() - authentikStart);
      if (res.ok) {
        results.push({
          name: "Authentik (OIDC)",
          status: "ok",
          responseTime: elapsed,
        });
      } else {
        // 401 = Authentik reachable but user not logged in — not an error
        results.push({
          name: "Authentik (OIDC)",
          status: res.status === 401 ? "no-auth" : "error",
          responseTime: elapsed,
        });
      }
    } catch {
      results.push({
        name: "Authentik (OIDC)",
        status: "error",
        responseTime: Math.round(performance.now() - authentikStart),
      });
    }

    // Test Celery Workers (via server action — internal endpoint)
    const celeryStart = performance.now();
    try {
      const data = await fetchCeleryHealth();
      const elapsed = Math.round(performance.now() - celeryStart);
      results.push({
        name: "Celery Workers",
        status: data.status === "ok" ? "ok" : "error",
        responseTime: elapsed,
        details: {
          workers: data.workers?.length
            ? String(data.workers.length)
            : "0",
        },
      });
    } catch (err) {
      const elapsed = Math.round(performance.now() - celeryStart);
      const isAuth = err instanceof Error && (err.message === "UNAUTHORIZED" || err.message === "BLOCKED");
      results.push({
        name: "Celery Workers",
        status: isAuth ? "no-auth" : "error",
        responseTime: elapsed,
      });
    }

    setServices(results);
    setTesting(false);
  }

  return { services, testing, runTests };
}
