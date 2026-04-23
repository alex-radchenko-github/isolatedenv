"use client";

import {
  IconClock,
  IconKey,
  IconLock,
  IconLockOpen,
  IconTrash,
  IconUserEdit,
} from "@tabler/icons-react";
import {
  Card,
  Title,
  Text,
  Stack,
  Group,
  Skeleton,
  Box,
  Badge,
} from "@mantine/core";
import { useMounted } from "@mantine/hooks";
import { EmptyState } from "@/components/empty-state";
import { useRecentActivity } from "@/hooks/use-recent-activity";
import { AUDIT_ACTION_LABELS } from "@/types/audit-log";
import type { AuditAction } from "@/types/audit-log";
import type { Icon } from "@tabler/icons-react";
import classes from "./recent-activity.module.css";

const ACTION_ICONS: Record<AuditAction, Icon> = {
  change_role: IconUserEdit,
  block_user: IconLock,
  unblock_user: IconLockOpen,
  delete_user: IconTrash,
  reset_password: IconKey,
};

const ACTION_COLORS: Record<AuditAction, string> = {
  change_role: "blue",
  block_user: "red",
  unblock_user: "green",
  delete_user: "red",
  reset_password: "orange",
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ActivitySkeleton() {
  return (
    <Stack gap="md">
      {Array.from({ length: 3 }).map((_, i) => (
        <Group key={i} align="flex-start" gap="sm" wrap="nowrap">
          <Skeleton circle height={32} width={32} />
          <Stack gap={4} className={classes.activityContent}>
            <Skeleton height={14} width="75%" />
            <Skeleton height={12} width="50%" />
          </Stack>
        </Group>
      ))}
    </Stack>
  );
}

export function RecentActivity() {
  const { data, isLoading, isAdmin } = useRecentActivity();
  const mounted = useMounted();
  const entries = data?.entries;

  const showAdmin = mounted && isAdmin;

  return (
    <Card withBorder shadow="sm" radius="md" p="lg">
      <Title order={4} mb="md">
        Recent Activity
      </Title>

      {!showAdmin ? (
        <EmptyState
          icon={IconLock}
          title="Admin access required"
          description="Audit log is available to administrators only."
        />
      ) : isLoading ? (
        <ActivitySkeleton />
      ) : entries && entries.length > 0 ? (
        <Stack gap="md">
          {entries.map((entry) => {
            const ActionIcon = ACTION_ICONS[entry.action as AuditAction] ?? IconClock;
            const color = ACTION_COLORS[entry.action as AuditAction] ?? "gray";
            const label = AUDIT_ACTION_LABELS[entry.action as AuditAction] ?? entry.action;

            return (
              <Group key={entry.id} align="flex-start" gap="sm" wrap="nowrap">
                <Box
                  w={32}
                  h={32}
                  className={classes.activityIcon}
                  bg={`var(--mantine-color-${color}-light)`}
                >
                  <ActionIcon
                    size={16}
                    stroke={1.5}
                    color={`var(--mantine-color-${color}-filled)`}
                  />
                </Box>
                <Stack gap={2} className={classes.activityContent}>
                  <Group gap="xs">
                    <Badge size="xs" variant="light" color={color}>
                      {label}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {timeAgo(entry.timestamp)}
                    </Text>
                  </Group>
                  <Text size="sm">
                    <Text span fw={500}>{entry.admin_email}</Text>
                    {" \u2192 "}
                    <Text span c="dimmed">{entry.target_user_email}</Text>
                  </Text>
                </Stack>
              </Group>
            );
          })}
        </Stack>
      ) : (
        <EmptyState
          icon={IconClock}
          title="No activity yet"
          description="Admin actions will appear here once they occur."
        />
      )}
    </Card>
  );
}
