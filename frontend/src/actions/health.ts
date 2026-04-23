/**
 * Health Server Actions — proxy internal health endpoints through server actions.
 * These endpoints are internal-only and must not be called directly from the client.
 */
"use server";

import {
  getHealthInfo,
  getHealthStatus,
  getCeleryHealth,
  type HealthInfo,
  type HealthStatus,
  type CeleryHealth,
} from "@/lib/dal/health";
import { withAuth } from "@/lib/action-utils";

export async function fetchHealthInfo(): Promise<HealthInfo> {
  return withAuth(() => getHealthInfo());
}

export async function fetchHealthStatus(): Promise<HealthStatus> {
  return withAuth(() => getHealthStatus());
}

export async function fetchCeleryHealth(): Promise<CeleryHealth> {
  return withAuth(() => getCeleryHealth());
}
