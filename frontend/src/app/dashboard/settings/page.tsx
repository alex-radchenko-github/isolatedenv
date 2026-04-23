import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { Skeleton, Stack, Box } from "@mantine/core";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Settings",
};

function SettingsTabsSkeleton() {
  return (
    <Box maw={672}>
      <Stack gap="md">
        <Skeleton height={40} maw={400} />
        <Skeleton height={192} />
      </Stack>
    </Box>
  );
}

export default function SettingsPage() {
  return (
    <main>
      <PageHeader
        title="Settings"
        description="Manage your account preferences."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.DASHBOARD },
          { label: "Settings" },
        ]}
      />
      <Box px="lg" mt="lg" pb="lg">
        <Suspense fallback={<SettingsTabsSkeleton />}>
          <SettingsTabs />
        </Suspense>
      </Box>
    </main>
  );
}
