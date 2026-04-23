"use server";

import { getAuditLog } from "@/lib/dal/audit-log";
import { withAuth } from "@/lib/action-utils";
import type { AuditAction, AuditLogResponse } from "@/types/audit-log";

export async function fetchAuditLog(
  offset = 0,
  limit = 20,
  action?: AuditAction,
  search?: string,
): Promise<AuditLogResponse> {
  return withAuth(() => getAuditLog(offset, limit, action, search));
}
