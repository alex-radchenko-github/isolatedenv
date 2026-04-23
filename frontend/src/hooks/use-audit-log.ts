"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAuditLog } from "@/actions/audit-log";
import type { AuditAction } from "@/types/audit-log";

export function useAuditLog(
  offset = 0,
  limit = 20,
  action?: AuditAction,
  search?: string,
) {
  return useQuery({
    queryKey: ["auditLog", offset, limit, action, search],
    queryFn: () => fetchAuditLog(offset, limit, action, search),
    staleTime: 30_000,
  });
}
