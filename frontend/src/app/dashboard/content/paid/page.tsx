import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IconLock } from "@tabler/icons-react";
import { Box } from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { getCurrentUser } from "@/lib/dal/user";
import { ApiError } from "@/lib/api-client";
import { hasRole } from "@/lib/rbac";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Paid Content",
};

export default async function PaidContentPage() {
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(ROUTES.DASHBOARD);
    }
    throw error;
  }

  if (!hasRole(user.role, "paid")) {
    return (
      <main>
        <PageHeader
          title="Paid Content"
          description="Premium content for paid and admin users."
          breadcrumbs={[
            { label: "Dashboard", href: ROUTES.DASHBOARD },
            { label: "Paid Content" },
          ]}
        />
        <Box px="lg" mt="lg" pb="lg">
          <EmptyState
            icon={IconLock}
            title="Access Denied"
            description="This content is only available to paid and admin users. Please upgrade your plan to access premium features."
          />
        </Box>
      </main>
    );
  }

  return (
    <main>
      <PageHeader
        title="Paid Content"
        description="Premium content for paid and admin users."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.DASHBOARD },
          { label: "Paid Content" },
        ]}
      />
      <Box px="lg" mt="lg" pb="lg">
        <EmptyState
          icon={IconLock}
          title="Paid Content"
          description="This premium section is available to paid and admin users only."
        />
      </Box>
    </main>
  );
}
