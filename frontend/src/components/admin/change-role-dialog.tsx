"use client";

import { useState } from "react";
import { Modal, Button, Group, Stack, Text, Select } from "@mantine/core";
import { useChangeUserRole } from "@/hooks/use-admin-users";
import { getRoleLabel } from "@/lib/rbac";
import type { AdminUser, UserRole } from "@/types/user";

interface ChangeRoleDialogProps {
  user: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLES: UserRole[] = ["free", "paid", "admin"];

export function ChangeRoleDialog({
  user,
  open,
  onOpenChange,
}: ChangeRoleDialogProps) {
  const [role, setRole] = useState<UserRole>(user.role);
  const mutation = useChangeUserRole();

  function handleSubmit() {
    mutation.mutate(
      { userId: user.id, role },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title="Change Role"
    >
      <Stack>
        <Text size="sm" c="dimmed">
          Change the role for {user.name} ({user.email}).
        </Text>
        <Select
          data={ROLES.map((r) => ({ value: r, label: getRoleLabel(r) }))}
          value={role}
          onChange={(v) => {
            if (v && (v === "free" || v === "paid" || v === "admin")) {
              setRole(v);
            }
          }}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending || role === user.role}
            loading={mutation.isPending}
          >
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
