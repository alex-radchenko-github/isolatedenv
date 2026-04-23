import type { UserRole } from "@/types/user";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  free: 1,
  paid: 2,
  admin: 3,
};

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    free: "Free",
    paid: "Paid",
    admin: "Admin",
  };
  return labels[role];
}

export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    free: "gray",
    paid: "green",
    admin: "blue",
  };
  return colors[role];
}
