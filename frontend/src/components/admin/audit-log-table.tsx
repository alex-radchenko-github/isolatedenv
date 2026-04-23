"use client";

import { useState } from "react";
import {
  IconArrowsSort,
  IconArrowUp,
  IconArrowDown,
  IconClipboardList,
} from "@tabler/icons-react";
import {
  Badge,
  Center,
  Group,
  ScrollArea,
  Skeleton,
  Table,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { EmptyState } from "@/components/empty-state";
import { AUDIT_ACTION_LABELS } from "@/types/audit-log";
import type { AuditLogEntry, AuditAction } from "@/types/audit-log";

interface AuditLogTableProps {
  entries: AuditLogEntry[];
  isLoading?: boolean;
}

type SortField = "timestamp" | "admin_email" | "action" | "target_user_email";
type SortDirection = "asc" | "desc";

function getActionBadgeColor(action: AuditAction): string {
  switch (action) {
    case "block_user":
    case "delete_user":
      return "red";
    case "unblock_user":
      return "green";
    case "change_role":
      return "blue";
    case "reset_password":
      return "yellow";
  }
}

function getActionBadgeVariant(
  action: AuditAction,
): "filled" | "light" | "outline" {
  switch (action) {
    case "block_user":
    case "delete_user":
      return "filled";
    case "unblock_user":
      return "outline";
    case "change_role":
      return "filled";
    case "reset_password":
      return "light";
  }
}

function formatDetails(details: Record<string, string> | null): string {
  if (!details) return "\u2014";
  if (details.old_role && details.new_role) {
    return `${details.old_role} \u2192 ${details.new_role}`;
  }
  return Object.entries(details)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

function SortIcon({
  field,
  sortField,
  sortDirection,
}: {
  field: SortField;
  sortField: SortField | null;
  sortDirection: SortDirection;
}) {
  if (sortField !== field) return <IconArrowsSort size={12} stroke={1.5} />;
  return sortDirection === "asc" ? (
    <IconArrowUp size={12} stroke={1.5} />
  ) : (
    <IconArrowDown size={12} stroke={1.5} />
  );
}

function AuditLogSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <Table.Tr key={i}>
          <Table.Td><Skeleton h={16} w={112} /></Table.Td>
          <Table.Td><Skeleton h={16} w={128} /></Table.Td>
          <Table.Td><Skeleton h={20} w={80} radius="xl" /></Table.Td>
          <Table.Td visibleFrom="md"><Skeleton h={16} w={128} /></Table.Td>
          <Table.Td visibleFrom="lg"><Skeleton h={16} w={96} /></Table.Td>
          <Table.Td visibleFrom="lg"><Skeleton h={16} w={96} /></Table.Td>
        </Table.Tr>
      ))}
    </>
  );
}

export function AuditLogTable({ entries, isLoading }: AuditLogTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // React Compiler handles memoization automatically
  const sorted = !sortField
    ? entries
    : [...entries].sort((a, b) => {
        let cmp = 0;
        if (sortField === "timestamp")
          cmp =
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        else if (sortField === "admin_email")
          cmp = a.admin_email.localeCompare(b.admin_email);
        else if (sortField === "action")
          cmp = a.action.localeCompare(b.action);
        else if (sortField === "target_user_email")
          cmp = a.target_user_email.localeCompare(b.target_user_email);
        return sortDirection === "asc" ? cmp : -cmp;
      });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  return (
    <ScrollArea>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>
              <UnstyledButton onClick={() => toggleSort("timestamp")}>
                <Group gap={4}>
                  <Text size="xs" fw={500}>Timestamp</Text>
                  <SortIcon
                    field="timestamp"
                    sortField={sortField}
                    sortDirection={sortDirection}
                  />
                </Group>
              </UnstyledButton>
            </Table.Th>
            <Table.Th>
              <UnstyledButton onClick={() => toggleSort("admin_email")}>
                <Group gap={4}>
                  <Text size="xs" fw={500}>Admin</Text>
                  <SortIcon
                    field="admin_email"
                    sortField={sortField}
                    sortDirection={sortDirection}
                  />
                </Group>
              </UnstyledButton>
            </Table.Th>
            <Table.Th>
              <UnstyledButton onClick={() => toggleSort("action")}>
                <Group gap={4}>
                  <Text size="xs" fw={500}>Action</Text>
                  <SortIcon
                    field="action"
                    sortField={sortField}
                    sortDirection={sortDirection}
                  />
                </Group>
              </UnstyledButton>
            </Table.Th>
            <Table.Th visibleFrom="md">
              <UnstyledButton onClick={() => toggleSort("target_user_email")}>
                <Group gap={4}>
                  <Text size="xs" fw={500}>Target User</Text>
                  <SortIcon
                    field="target_user_email"
                    sortField={sortField}
                    sortDirection={sortDirection}
                  />
                </Group>
              </UnstyledButton>
            </Table.Th>
            <Table.Th visibleFrom="lg">
              <Text size="xs" fw={500}>Details</Text>
            </Table.Th>
            <Table.Th visibleFrom="lg">
              <Text size="xs" fw={500}>IP</Text>
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {isLoading ? (
            <AuditLogSkeleton />
          ) : sorted.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <EmptyState
                  icon={IconClipboardList}
                  title="No audit log entries"
                  description="No entries match the current filters."
                />
              </Table.Td>
            </Table.Tr>
          ) : (
            sorted.map((entry) => (
              <Table.Tr key={entry.id}>
                <Table.Td>
                  <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>{entry.admin_email}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge
                    variant={getActionBadgeVariant(entry.action)}
                    color={getActionBadgeColor(entry.action)}
                  >
                    {AUDIT_ACTION_LABELS[entry.action]}
                  </Badge>
                </Table.Td>
                <Table.Td visibleFrom="md">
                  <Text size="sm">{entry.target_user_email}</Text>
                </Table.Td>
                <Table.Td visibleFrom="lg">
                  <Text size="sm" c="dimmed">
                    {formatDetails(entry.details)}
                  </Text>
                </Table.Td>
                <Table.Td visibleFrom="lg">
                  <Text size="xs" c="dimmed" ff="monospace">
                    {entry.ip_address ?? "\u2014"}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}
