"use client";

import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { fetchAdminUsers } from "@/actions/admin";
import { fetchAuditLog } from "@/actions/audit-log";

export interface DashboardStats {
  email: string;
  role: string;
  created_at: string;
  total_users: number | null;
  total_audit_events: number | null;
}

export function useDashboardStats() {
  const { data: user, isLoading: userLoading } = useUser();
  const isAdmin = user?.role === "admin";

  const { data: adminUsersData, isLoading: adminUsersLoading } = useQuery({
    queryKey: ["dashboard", "adminUsersCount"],
    queryFn: () => fetchAdminUsers(0, 1),
    enabled: isAdmin,
    staleTime: 60_000,
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["dashboard", "auditCount"],
    queryFn: () => fetchAuditLog(0, 1),
    enabled: isAdmin,
    staleTime: 60_000,
  });

  const isLoading =
    userLoading || (isAdmin && (adminUsersLoading || auditLoading));

  const stats: DashboardStats | undefined = user
    ? {
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        total_users: adminUsersData?.total ?? null,
        total_audit_events: auditData?.total ?? null,
      }
    : undefined;

  return { data: stats, isAdmin, isLoading };
}
