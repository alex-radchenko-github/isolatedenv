import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton, Stack, SimpleGrid } from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { ConnectionTest } from "@/components/connection-test";
import { SystemInfo } from "@/components/dashboard/system-info";
import { SmokeTest } from "@/components/dashboard/smoke-test";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <main>
      <PageHeader
        title="Dashboard"
        description="Welcome to your project dashboard."
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.DASHBOARD }]}
      />
      <Stack gap="lg" px="lg" mt="lg" pb="lg">
        <StatsCards />
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
          <Suspense fallback={<Skeleton height={256} radius="md" />}>
            <ConnectionTest />
          </Suspense>
          <SystemInfo />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
          <RecentActivity />
          <SmokeTest />
        </SimpleGrid>
      </Stack>
    </main>
  );
}
