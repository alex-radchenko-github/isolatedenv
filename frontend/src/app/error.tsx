"use client";

import { useEffect } from "react";
import { Button, Center, Stack, Title, Text } from "@mantine/core";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error.digest, error.message);
  }, [error]);

  return (
    <Center mih="100vh">
      <Stack align="center" gap="md">
        <Title order={2}>Something went wrong</Title>
        <Text c="dimmed">An unexpected error occurred. Please try again.</Text>
        <Button onClick={reset}>Try again</Button>
      </Stack>
    </Center>
  );
}
