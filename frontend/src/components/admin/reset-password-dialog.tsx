"use client";

import { useState } from "react";
import { IconCopy, IconCheck } from "@tabler/icons-react";
import { Modal, Button, Group, Stack, Text, TextInput, ActionIcon, CopyButton } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useResetUserPassword } from "@/hooks/use-admin-users";
import type { AdminUser } from "@/types/user";

interface ResetPasswordDialogProps {
  user: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
}: ResetPasswordDialogProps) {
  const mutation = useResetUserPassword();
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );

  function handleConfirm() {
    mutation.mutate(user.id, {
      onSuccess: (data) => {
        setTemporaryPassword(data.temporary_password);
        notifications.show({
          title: "Success",
          message: "Password has been reset",
          color: "green",
        });
      },
    });
  }

  function handleClose() {
    setTemporaryPassword(null);
    onOpenChange(false);
  }

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      title={temporaryPassword ? "Password Reset Complete" : "Reset Password"}
    >
      <Stack>
        <Text size="sm" c="dimmed">
          {temporaryPassword ? (
            <>
              The password for {user.name} ({user.email}) has been reset.
              Please copy the temporary password below and share it securely
              with the user. It will not be shown again.
            </>
          ) : (
            <>
              Are you sure you want to reset the password for {user.name} (
              {user.email})? Their password will be set to a temporary value.
            </>
          )}
        </Text>

        {temporaryPassword && (
          <Group gap="xs">
            <TextInput
              readOnly
              value={temporaryPassword}
              style={{ flex: 1 }}
              styles={{ input: { fontFamily: "monospace", fontSize: "var(--mantine-font-size-sm)" } }}
            />
            <CopyButton value={temporaryPassword}>
              {({ copied, copy }) => (
                <ActionIcon
                  variant="default"
                  onClick={() => {
                    copy();
                    notifications.show({
                      title: "Copied",
                      message: "Password copied to clipboard",
                      color: "green",
                    });
                  }}
                  aria-label="Copy password"
                >
                  {copied ? (
                    <IconCheck size={16} stroke={1.5} color="var(--mantine-color-green-6)" />
                  ) : (
                    <IconCopy size={16} stroke={1.5} />
                  )}
                </ActionIcon>
              )}
            </CopyButton>
          </Group>
        )}

        <Group justify="flex-end">
          {temporaryPassword ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="default" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={mutation.isPending}
                loading={mutation.isPending}
              >
                {mutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
