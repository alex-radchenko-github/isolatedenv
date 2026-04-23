"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Anchor, Center, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  token_exchange: "Failed to complete authentication. Please try again.",
  missing_state: "Authentication session expired. Please try again.",
  access_denied: "Access was denied by the identity provider.",
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") ?? "unknown";
  const message =
    ERROR_MESSAGES[reason] ?? "An unexpected authentication error occurred.";

  return (
    <Center mih="100vh">
      <Stack align="center" gap="md" maw={480} px="md">
        <Title order={2}>Authentication Error</Title>
        <Text c="dimmed" ta="center">
          {message}
        </Text>
        <Anchor component={Link} href="/api/auth/authorize" fw={500}>
          Try again
        </Anchor>
      </Stack>
    </Center>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <Center mih="100vh">
          <Text c="dimmed">Loading...</Text>
        </Center>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
