"use client";

import { useEffect, useState } from "react";
import { Button, Center, Stack, Title, Text, Group } from "@mantine/core";
import { ROUTES } from "@/lib/routes";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.error("[DashboardErrorBoundary]", error.digest, error.message);
  }, [error]);

  async function handleRefreshAndRetry() {
    setRefreshing(true);
    try {
      reset();
    } catch {
      window.location.replace(ROUTES.AUTH_AUTHORIZE);
    } finally {
      setRefreshing(false);
    }
  }

  if (error.message === "UNAUTHORIZED") {
    return (
      <Center component="main" p="lg">
        <Stack align="center" gap="md">
          <Title order={2}>Session Expired</Title>
          <Text c="dimmed">Your session has expired. Please log in again.</Text>
          <Button onClick={() => window.location.replace(ROUTES.AUTH_AUTHORIZE)}>
            Go to Login
          </Button>
        </Stack>
      </Center>
    );
  }

  if (error.message === "FORBIDDEN") {
    return (
      <Center component="main" p="lg">
        <Stack align="center" gap="md">
          <Title order={2}>Access Denied</Title>
          <Text c="dimmed">
            You don&apos;t have permission to access this page.
          </Text>
          <Button onClick={() => window.location.replace(ROUTES.DASHBOARD)}>
            Back to Dashboard
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Center component="main" p="lg">
      <Stack align="center" gap="md">
        <Title order={2}>Dashboard Error</Title>
        <Text c="dimmed">Something went wrong loading the dashboard.</Text>
        <Group>
          <Button onClick={reset}>Try again</Button>
          <Button
            variant="outline"
            onClick={handleRefreshAndRetry}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh session & retry"}
          </Button>
        </Group>
      </Stack>
    </Center>
  );
}
