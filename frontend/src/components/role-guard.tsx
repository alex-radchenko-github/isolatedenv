"use client";

import { IconShieldExclamation } from "@tabler/icons-react";
import { Center } from "@mantine/core";
import { useRole } from "@/hooks/use-role";
import { EmptyState } from "@/components/empty-state";
import type { UserRole } from "@/types/user";

interface RoleGuardProps {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ roles, children, fallback }: RoleGuardProps) {
  const { role, isLoading, hasRole } = useRole();

  if (isLoading) {
    return null;
  }

  const allowed = roles.some((r) => hasRole(r));
  if (!allowed) {
    return (
      fallback ?? (
        <Center mih="60vh">
          <EmptyState
            icon={IconShieldExclamation}
            title="Access Denied"
            description={`Your role "${role}" does not have access to this page.`}
          />
        </Center>
      )
    );
  }

  return <>{children}</>;
}
