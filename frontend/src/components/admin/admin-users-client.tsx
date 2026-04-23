"use client";

import { useState } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { ActionIcon, Group, Stack, Text } from "@mantine/core";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { UsersTable } from "@/components/admin/users-table";

const PAGE_SIZE = 20;

export function AdminUsersClient() {
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useAdminUsers(offset, PAGE_SIZE);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <Stack gap="md">
      <UsersTable users={data?.users ?? []} isLoading={isLoading} />
      {totalPages > 1 && (
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {data?.total ?? 0} user{(data?.total ?? 0) !== 1 ? "s" : ""} total
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
