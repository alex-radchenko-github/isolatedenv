"use client";

import { Modal, Button, Group, Stack, Text } from "@mantine/core";
import { useDeleteUser } from "@/hooks/use-admin-users";
import type { AdminUser } from "@/types/user";

interface DeleteUserDialogProps {
  user: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
}: DeleteUserDialogProps) {
  const mutation = useDeleteUser();

  function handleConfirm() {
    mutation.mutate(user.id, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title="Delete User"
    >
      <Stack>
        <Text size="sm" c="dimmed">
          Are you sure you want to permanently delete {user.name}? This action
          cannot be undone. The user will be removed from both the database and
          authentication provider.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleConfirm}
            disabled={mutation.isPending}
            loading={mutation.isPending}
          >
            {mutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
