import type { Metadata } from "next";
import { IconFileText, IconSparkles } from "@tabler/icons-react";
import { Card, Title, Text, Button, Group, Stack } from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Free Content",
};

export default function FreeContentPage() {
  return (
    <main>
      <PageHeader
        title="Free Content"
        description="Content available to all authenticated users."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.DASHBOARD },
          { label: "Free Content" },
        ]}
      />
      <Stack gap="lg" px="lg" mt="lg" pb="lg">
        <EmptyState
          icon={IconFileText}
          title="Free Content"
          description="This section is available to all authenticated users regardless of their role."
        />
        <Card withBorder p="lg" style={{ borderStyle: "dashed" }}>
          <Group gap="sm" mb="xs">
            <IconSparkles size={20} stroke={1.5} />
            <Title order={4}>Upgrade to Premium</Title>
          </Group>
          <Text size="sm" c="dimmed" mb="md">
            Get access to exclusive content, priority support, and advanced
            features.
          </Text>
          <Button>Upgrade Now</Button>
        </Card>
      </Stack>
    </main>
  );
}
