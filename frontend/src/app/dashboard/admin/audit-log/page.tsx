import type { Metadata } from "next";
import { Box } from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { AuditLogClient } from "@/components/admin/audit-log-client";
import { getCurrentUser } from "@/lib/dal/user";
import { ApiError } from "@/lib/api-client";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Audit Log",
};

export default async function AuditLogPage() {
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw new Error("UNAUTHORIZED");
    }
    throw error;
  }

  if (user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return (
    <main>
      <PageHeader
        title="Audit Log"
        description="Track all administrative actions and system events."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.DASHBOARD },
          { label: "Admin" },
          { label: "Audit Log" },
        ]}
      />
      <Box px="lg" mt="lg" pb="lg">
        <AuditLogClient />
      </Box>
    </main>
  );
}
