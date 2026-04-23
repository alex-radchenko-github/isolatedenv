"use client";

import { useState } from "react";
import { useForm } from "@mantine/form";
import { schemaResolver } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  TextInput,
  Button,
  Card,
  Title,
  Text,
  Stack,
  Group,
  Modal,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { deleteMyAccount } from "@/actions/user";
import { getQueryClient } from "@/lib/query-client";
import {
  deleteAccountSchema,
  type DeleteAccountValues,
} from "@/lib/validations/settings";
import { ROUTES } from "@/lib/routes";

export function DeleteAccountSection() {
  const [opened, modal] = useDisclosure(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<DeleteAccountValues>({
    mode: "uncontrolled",
    initialValues: { confirmation: "" as "DELETE" },
    validate: schemaResolver(deleteAccountSchema),
  });

  async function onSubmit() {
    setSubmitting(true);
    try {
      await deleteMyAccount();
      const queryClient = getQueryClient();
      queryClient.clear();
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {
        // Session may already be invalidated
      }
      notifications.show({
        title: "Success",
        message: "Account deleted successfully",
        color: "green",
      });
      window.location.replace(ROUTES.HOME);
    } catch (err) {
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Deletion failed",
        color: "red",
      });
      setSubmitting(false);
    }
  }

  return (
    <Card
      withBorder
      shadow="sm"
      radius="md"
      p="lg"
      style={{ borderColor: "var(--mantine-color-red-4)" }}
    >
      <Title order={3} mb={4} c="red">
        Danger Zone
      </Title>
      <Text size="sm" c="dimmed" mb="lg">
        Permanently delete your account. This action cannot be undone.
      </Text>

      <Button color="red" onClick={modal.open}>
        Delete Account
      </Button>

      <Modal opened={opened} onClose={modal.close} title="Are you absolutely sure?">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            This will permanently delete your account and remove all your data.
            Type <Text component="span" fw={700}>DELETE</Text> to confirm.
          </Text>

          <form onSubmit={form.onSubmit(onSubmit)}>
            <Stack gap="md">
              <TextInput
                label="Type DELETE to confirm"
                placeholder="DELETE"
                key={form.key("confirmation")}
                {...form.getInputProps("confirmation")}
              />
              <Group justify="flex-end">
                <Button variant="default" onClick={modal.close}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="red"
                  disabled={submitting}
                  loading={submitting}
                >
                  {submitting ? "Deleting..." : "Delete Account"}
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Modal>
    </Card>
  );
}
