import { DashboardShell } from "./dashboard-shell";

/**
 * Dashboard layout.
 * Auth guard is handled by proxy.ts (JWT presence + expiry check).
 * No redundant cookie check needed here.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
