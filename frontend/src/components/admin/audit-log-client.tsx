"use client";

import { useState, useEffect } from "react";
import { IconChevronLeft, IconChevronRight, IconSearch } from "@tabler/icons-react";
import { ActionIcon, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { useAuditLog } from "@/hooks/use-audit-log";
import { AuditLogTable } from "@/components/admin/audit-log-table";
import { AUDIT_ACTION_LABELS } from "@/types/audit-log";
import type { AuditAction } from "@/types/audit-log";

const PAGE_SIZE = 20;

export function AuditLogClient() {
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<AuditAction | undefined>();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useAuditLog(
    offset,
    PAGE_SIZE,
    actionFilter,
    debouncedSearch || undefined,
  );

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  function handleActionFilter(value: string | null) {
    setActionFilter(
      value === null || value === "all" ? undefined : (value as AuditAction),
    );
    setOffset(0);
  }

  return (
    <Stack gap="md">
      <Group gap="md" wrap="wrap">
        <TextInput
          placeholder="Search by email..."
          leftSection={<IconSearch size={16} stroke={1.5} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1, maxWidth: 384 }}
        />
        <Select
          data={[
            { value: "all", label: "All actions" },
            ...Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          value={actionFilter ?? "all"}
          onChange={handleActionFilter}
          w={{ base: "100%", sm: 180 }}
        />
      </Group>

      <AuditLogTable entries={data?.entries ?? []} isLoading={isLoading} />

      {totalPages > 1 && (
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {data?.total ?? 0} entr{(data?.total ?? 0) !== 1 ? "ies" : "y"} total
          </Text>
          <Group gap="sm">
            <ActionIcon
              variant="default"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              aria-label="Previous page"
            >
              <IconChevronLeft size={16} stroke={1.5} />
            </ActionIcon>
            <Text size="sm">
              Page {currentPage} of {totalPages}
            </Text>
            <ActionIcon
              variant="default"
              disabled={offset + PAGE_SIZE >= (data?.total ?? 0)}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              aria-label="Next page"
            >
              <IconChevronRight size={16} stroke={1.5} />
            </ActionIcon>
          </Group>
        </Group>
      )}
    </Stack>
  );
}
