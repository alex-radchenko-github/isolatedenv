"use client";

import {
  IconCalendar,
  IconFileText,
  IconShield,
  IconUsers,
} from "@tabler/icons-react";
import {
  Badge,
  Card,
  SimpleGrid,
  Group,
  Text,
  Title,
  Skeleton,
} from "@mantine/core";
import { useMounted } from "@mantine/hooks";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";

function StatCardSkeleton() {
  return (
    <Card withBorder shadow="sm" radius="md" p="lg">
      <Group justify="space-between" mb="sm">
        <Skeleton height={14} width={96} />
        <Skeleton height={14} width={14} />
      </Group>
      <Skeleton height={28} width={64} mb={4} />
      <Skeleton height={12} width={128} />
    </Card>
  );
}

function formatAccountAge(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function formatDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const ROLE_COLORS: Record<string, string> = {
  admin: "red",
  paid: "blue",
  free: "gray",
};

export function StatsCards() {
  const { data, isAdmin, isLoading } = useDashboardStats();
  const mounted = useMounted();

  const showAdmin = mounted && isAdmin;

  if (!mounted || isLoading) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <StatCardSkeleton />
        <StatCardSkeleton />
      </SimpleGrid>
    );
  }

  if (!data) return null;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: showAdmin ? 4 : 2 }}>
      {/* Your Role — all users */}
      <Card withBorder shadow="sm" radius="md" p="lg">
        <Group justify="space-between" mb="sm">
          <Text size="sm" fw={500}>
            Your Role
          </Text>
          <IconShield size={16} stroke={1.5} color="var(--mantine-color-dimmed)" />
        </Group>
        <Group gap="xs" mb={4}>
          <Badge size="lg" variant="filled" color={ROLE_COLORS[data.role] ?? "gray"}>
            {data.role}
          </Badge>
        </Group>
        <Text size="xs" c="dimmed" mt={4} truncate>
          {data.email}
        </Text>
      </Card>

      {/* Account Age — all users */}
      <Card withBorder shadow="sm" radius="md" p="lg">
        <Group justify="space-between" mb="sm">
          <Text size="sm" fw={500}>
            Account Age
          </Text>
          <IconCalendar size={16} stroke={1.5} color="var(--mantine-color-dimmed)" />
        </Group>
        <Title order={3} fw={700}>
          {formatAccountAge(data.created_at)}
        </Title>
        <Text size="xs" c="dimmed" mt={4}>
          Since {formatDate(data.created_at)}
        </Text>
      </Card>

      {/* Total Users — admin only */}
      {showAdmin && (
        <Card withBorder shadow="sm" radius="md" p="lg">
          <Group justify="space-between" mb="sm">
            <Text size="sm" fw={500}>
              Total Users
            </Text>
            <IconUsers size={16} stroke={1.5} color="var(--mantine-color-dimmed)" />
          </Group>
          <Title order={3} fw={700}>
            {data.total_users ?? "\u2014"}
          </Title>
          <Text size="xs" c="dimmed" mt={4}>
            Registered accounts
          </Text>
        </Card>
      )}

      {/* Audit Events — admin only */}
      {showAdmin && (
        <Card withBorder shadow="sm" radius="md" p="lg">
          <Group justify="space-between" mb="sm">
            <Text size="sm" fw={500}>
              Audit Events
            </Text>
            <IconFileText size={16} stroke={1.5} color="var(--mantine-color-dimmed)" />
          </Group>
          <Title order={3} fw={700}>
            {data.total_audit_events ?? "\u2014"}
          </Title>
          <Text size="xs" c="dimmed" mt={4}>
            Admin actions logged
          </Text>
        </Card>
      )}
    </SimpleGrid>
  );
}
