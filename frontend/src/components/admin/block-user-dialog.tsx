"use client";

import { Modal, Button, Group, Stack, Text, Loader } from "@mantine/core";
import { useChangeUserStatus } from "@/hooks/use-admin-users";
import type { AdminUser } from "@/types/user";

interface BlockUserDialogProps {
  user: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BlockUserDialog({
  user,
  open,
  onOpenChange,
}: BlockUserDialogProps) {
  const mutation = useChangeUserStatus();
  const willBlock = user.is_active;

  function handleConfirm() {
    mutation.mutate(
      { userId: user.id, isActive: !user.is_active },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={willBlock ? "Block User" : "Unblock User"}
    >
      <Stack>
        <Text size="sm" c="dimmed">
          {willBlock
            ? `Are you sure you want to block ${user.name}? They will not be able to access the application.`
            : `Are you sure you want to unblock ${user.name}? They will regain access to the application.`}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={mutation.isPending}
            loading={mutation.isPending}
          >
            {mutation.isPending
              ? "Processing..."
              : willBlock
                ? "Block"
                : "Unblock"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
