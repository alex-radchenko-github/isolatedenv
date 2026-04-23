/**
 * Audit Log Data Access Layer — admin audit log endpoints.
 */
import "server-only";

import { apiClient } from "@/lib/api-client";
import type { AuditAction, AuditLogResponse } from "@/types/audit-log";

export async function getAuditLog(
  offset = 0,
  limit = 20,
  action?: AuditAction,
  search?: string,
): Promise<AuditLogResponse> {
  const params = new URLSearchParams();
  params.set("offset", String(offset));
  params.set("limit", String(limit));
  if (action) params.set("action", action);
  if (search) params.set("search", search);
  return apiClient.get<AuditLogResponse>(`/api/v1/admin/audit-log?${params}`);
}
