/**
 * Health Data Access Layer — server-only access to health endpoints.
 *
 * Note: "use cache" cannot be used here because apiClient reads cookies()
 * for auth headers, and cookies() is a dynamic data source incompatible
 * with "use cache". Caching is handled by TanStack Query on the client.
 */
import "server-only";

import { apiClient } from "@/lib/api-client";

export interface HealthInfo {
  app_version: string;
  python_version: string;
  postgresql_version: string;
  redis_version: string;
  uptime_seconds: number;
}

export interface HealthStatus {
  status: string;
  redis?: string;
  database?: string;
  authentik?: string;
}

export interface CeleryHealth {
  status: string;
  workers?: Array<{ hostname: string }>;
}

export async function getHealthInfo(): Promise<HealthInfo> {
  return apiClient.get("/health/info");
}

export async function getHealthStatus(): Promise<HealthStatus> {
  return apiClient.get("/health");
}

export async function getCeleryHealth(): Promise<CeleryHealth> {
  return apiClient.get("/health/celery");
}
