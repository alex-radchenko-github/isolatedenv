import type { Metadata } from "next";
import { Box } from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/dal/user";
import { ApiError } from "@/lib/api-client";
import { ROUTES } from "@/lib/routes";
import { AdminUsersClient } from "@/components/admin/admin-users-client";

export const metadata: Metadata = {
  title: "User Management",
};

export default async function AdminUsersPage() {
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
        title="User Management"
        description="Manage users, roles, and access."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.DASHBOARD },
          { label: "Users" },
        ]}
      />
      <Box px="lg" mt="lg" pb="lg">
        <AdminUsersClient />
      </Box>
    </main>
  );
}
