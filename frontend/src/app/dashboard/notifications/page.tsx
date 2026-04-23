import type { Metadata } from "next";
import { IconBell } from "@tabler/icons-react";
import { Box } from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Notifications",
};

export default function NotificationsPage() {
  return (
    <main>
      <PageHeader
        title="Notifications"
        description="Stay updated with your latest activity."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.DASHBOARD },
          { label: "Notifications" },
        ]}
      />
      <Box px="lg" mt="lg" pb="lg">
        <EmptyState
          icon={IconBell}
          title="No notifications"
          description="You're all caught up! New notifications will appear here."
        />
      </Box>
    </main>
  );
}
