"use client";

import {
  IconFlask,
  IconPlayerPlay,
} from "@tabler/icons-react";
import {
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useSmokeTest } from "@/hooks/use-smoke-test";

export function SmokeTest() {
  const { results, running, runTests } = useSmokeTest();

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;
  const totalLatency = results.reduce((sum, r) => sum + (r.latency ?? 0), 0);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="xs">
          <IconFlask size={20} stroke={1.5} color="var(--mantine-color-dimmed)" />
          <Title order={4}>API Smoke Tests</Title>
        </Group>
        <Button
          variant="outline"
          size="sm"
          onClick={runTests}
          disabled={running}
          leftSection={
            running ? (
              <Loader size={14} />
            ) : (
              <IconPlayerPlay size={16} stroke={1.5} />
            )
          }
        >
          Run Tests
        </Button>
      </Group>

      <Card withBorder shadow="sm" radius="md" p="md">
        {results.length === 0 && !running ? (
          <Text c="dimmed" ta="center" py="xl">
            Click Run Tests to verify API endpoints
          </Text>
        ) : (
          <Stack gap="xs">
            {results.map((result) => (
              <Group key={result.name} justify="space-between" py={4}>
                <Group gap="xs">
                  <Badge
                    size="sm"
                    variant="filled"
                    color={
                      result.status === "pass"
                        ? "green"
                        : result.status === "fail"
                          ? "red"
                          : result.status === "skip"
                            ? "yellow"
                            : "gray"
                    }
                    w={48}
                  >
                    {result.status}
                  </Badge>
                  <Text size="sm">{result.name}</Text>
                </Group>
                <Text size="sm" c="dimmed" ff="monospace">
                  {result.latency !== undefined ? `${result.latency}ms` : "..."}
                </Text>
              </Group>
            ))}

            {running && results.length > 0 && (
              <Group gap="xs" py={4}>
                <Loader size={14} />
                <Text size="sm" c="dimmed">
                  Running...
                </Text>
              </Group>
            )}

            {!running && results.length > 0 && (
              <Group justify="space-between" pt="xs" mt="xs" style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
                <Text size="sm" fw={500}>
                  {failed === 0 && skipped === 0
                    ? `All ${passed} tests passed`
                    : failed === 0 && skipped > 0
                      ? `${passed} passed, ${skipped} skipped (login required)`
                      : `${passed}/${passed + failed} passed${skipped > 0 ? `, ${skipped} skipped` : ""}`}
                </Text>
                <Text size="sm" c="dimmed" ff="monospace">
                  {totalLatency}ms total
                </Text>
              </Group>
            )}
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
