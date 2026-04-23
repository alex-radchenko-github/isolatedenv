"use client";

import { useState } from "react";
import {
  IconSearch,
  IconArrowsSort,
  IconArrowUp,
  IconArrowDown,
} from "@tabler/icons-react";
import {
  Badge,
  Checkbox,
  Group,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  UnstyledButton,
  ScrollArea,
  Center,
} from "@mantine/core";
import { getRoleBadgeColor, getRoleLabel } from "@/lib/rbac";
import { UserRowActions } from "@/components/admin/user-row-actions";
import type { AdminUser } from "@/types/user";

interface UsersTableProps {
  users: AdminUser[];
  isLoading?: boolean;
}

type SortField = "name" | "email" | "created_at";
type SortDirection = "asc" | "desc";

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

function UsersTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <Table.Tr key={i}>
          <Table.Td><Skeleton h={16} w={16} /></Table.Td>
          <Table.Td><Skeleton h={16} w={96} /></Table.Td>
          <Table.Td visibleFrom="md"><Skeleton h={16} w={128} /></Table.Td>
          <Table.Td><Skeleton h={20} w={48} radius="xl" /></Table.Td>
          <Table.Td><Skeleton h={20} w={56} radius="xl" /></Table.Td>
          <Table.Td visibleFrom="md"><Skeleton h={16} w={80} /></Table.Td>
          <Table.Td><Skeleton h={32} w={32} /></Table.Td>
        </Table.Tr>
      ))}
    </>
  );
}

export function UsersTable({ users, isLoading }: UsersTableProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // React Compiler handles memoization automatically
  let filteredAndSorted = users;

  if (search) {
    const q = search.toLowerCase();
    filteredAndSorted = filteredAndSorted.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }

  if (sortField) {
    filteredAndSorted = [...filteredAndSorted].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "email") cmp = a.email.localeCompare(b.email);
      else if (sortField === "created_at")
        cmp =
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime();
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function toggleAll() {
    if (selectedIds.size === filteredAndSorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSorted.map((u) => u.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Stack gap="md">
      <Group gap="md">
        <TextInput
          placeholder="Search users..."
          leftSection={<IconSearch size={16} stroke={1.5} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1, maxWidth: 384 }}
        />
        {selectedIds.size > 0 && (
          <Text size="sm" c="dimmed">
            {selectedIds.size} selected
          </Text>
        )}
      </Group>

      <ScrollArea>
        <Table striped highlightOnHover withTableBorder withColumnBorders={false}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={48}>
                <Checkbox
                  checked={
                    filteredAndSorted.length > 0 &&
                    selectedIds.size === filteredAndSorted.length
                  }
                  indeterminate={
                    selectedIds.size > 0 &&
                    selectedIds.size < filteredAndSorted.length
                  }
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </Table.Th>
              <Table.Th>
                <UnstyledButton onClick={() => toggleSort("name")}>
                  <Group gap={4}>
                    <Text size="xs" fw={500}>Name</Text>
                    <SortIcon
                      field="name"
                      sortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </Group>
                </UnstyledButton>
              </Table.Th>
              <Table.Th visibleFrom="md">
                <UnstyledButton onClick={() => toggleSort("email")}>
                  <Group gap={4}>
                    <Text size="xs" fw={500}>Email</Text>
                    <SortIcon
                      field="email"
                      sortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </Group>
                </UnstyledButton>
              </Table.Th>
              <Table.Th>
                <Text size="xs" fw={500}>Role</Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" fw={500}>Status</Text>
              </Table.Th>
              <Table.Th visibleFrom="md">
                <UnstyledButton onClick={() => toggleSort("created_at")}>
                  <Group gap={4}>
                    <Text size="xs" fw={500}>Created</Text>
                    <SortIcon
                      field="created_at"
                      sortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </Group>
                </UnstyledButton>
              </Table.Th>
              <Table.Th w={48} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <UsersTableSkeleton />
            ) : filteredAndSorted.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Center h={96}>
                    <Text c="dimmed" size="sm">
                      {search
                        ? "No users match your search."
                        : "No users found."}
                    </Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredAndSorted.map((user) => (
                <Table.Tr
                  key={user.id}
                  bg={
                    selectedIds.has(user.id)
                      ? "var(--mantine-color-blue-light)"
                      : undefined
                  }
                >
                  <Table.Td>
                    <Checkbox
                      checked={selectedIds.has(user.id)}
                      onChange={() => toggleOne(user.id)}
                      aria-label={`Select ${user.name}`}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>{user.name}</Text>
                  </Table.Td>
                  <Table.Td visibleFrom="md">
                    <Text size="sm">{user.email}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      variant="light"
                      color={getRoleBadgeColor(user.role)}
                    >
                      {getRoleLabel(user.role)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      variant={user.is_active ? "outline" : "filled"}
                      color={user.is_active ? "green" : "red"}
                    >
                      {user.is_active ? "Active" : "Blocked"}
                    </Badge>
                  </Table.Td>
                  <Table.Td visibleFrom="md">
                    <Text size="sm" c="dimmed">
                      {new Date(user.created_at).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <UserRowActions user={user} />
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
}
