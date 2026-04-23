"use client";

import { IconServer } from "@tabler/icons-react";
import {
  Card,
  Group,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useSystemInfo } from "@/hooks/use-system-info";

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const mins = Math.floor((seconds % 3_600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${mins}m`);
  return parts.join(" ");
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <Group justify="space-between" py={4}>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={500} ff="monospace">
        {value}
      </Text>
    </Group>
  );
}

function InfoSkeleton() {
  return (
    <Stack gap="xs">
      {Array.from({ length: 5 }).map((_, i) => (
        <Group key={i} justify="space-between">
          <Skeleton height={14} width={100} />
          <Skeleton height={14} width={80} />
        </Group>
      ))}
    </Stack>
  );
}

export function SystemInfo() {
  const { data, isLoading, isError } = useSystemInfo();

  return (
    <Stack gap="md">
      <Group gap="xs">
        <IconServer size={20} stroke={1.5} color="var(--mantine-color-dimmed)" />
        <Title order={4}>System Info</Title>
      </Group>

      <Card withBorder shadow="sm" radius="md" p="md">
        {isLoading ? (
          <InfoSkeleton />
        ) : isError || !data ? (
          <Text size="sm" c="dimmed" ta="center" py="md">
            Failed to load system info
          </Text>
        ) : (
          <Stack gap={0}>
            <InfoRow label="App Version" value={data.app_version} />
            <InfoRow label="Python" value={data.python_version} />
            <InfoRow label="PostgreSQL" value={data.postgresql_version} />
            <InfoRow label="Redis" value={data.redis_version} />
            <InfoRow label="Uptime" value={formatUptime(data.uptime_seconds)} />
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
