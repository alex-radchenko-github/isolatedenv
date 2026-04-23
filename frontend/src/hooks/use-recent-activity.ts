"use client";

import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { fetchAuditLog } from "@/actions/audit-log";
import type { AuditLogResponse } from "@/types/audit-log";

export function useRecentActivity() {
  const { data: user } = useUser();
  const isAdmin = user?.role === "admin";

  const query = useQuery<AuditLogResponse>({
    queryKey: ["dashboard", "recentActivity"],
    queryFn: () => fetchAuditLog(0, 5),
    enabled: isAdmin,
    staleTime: 30_000,
  });

  return { ...query, isAdmin };
}
