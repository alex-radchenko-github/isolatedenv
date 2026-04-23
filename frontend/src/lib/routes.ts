/**
 * Centralized route constants.
 */
export const ROUTES = {
  HOME: "/",
  AUTH_AUTHORIZE: "/api/auth/authorize",
  DASHBOARD: "/dashboard",
  CONTENT_FREE: "/dashboard/content/free",
  CONTENT_PAID: "/dashboard/content/paid",
  ADMIN_USERS: "/dashboard/admin/users",
  ADMIN_AUDIT_LOG: "/dashboard/admin/audit-log",
  SETTINGS: "/dashboard/settings",
  NOTIFICATIONS: "/dashboard/notifications",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
