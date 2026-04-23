"use client";

import { useState } from "react";
import { useForm, schemaResolver } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  PasswordInput,
  Button,
  Card,
  Title,
  Text,
  Stack,
} from "@mantine/core";
import { updatePassword } from "@/actions/user";
import {
  passwordSchema,
  type PasswordValues,
} from "@/lib/validations/settings";

export function PasswordForm() {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PasswordValues>({
    mode: "uncontrolled",
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validate: schemaResolver(passwordSchema),
  });

  async function onSubmit(values: PasswordValues) {
    setSubmitting(true);
    try {
      await updatePassword({
        current_password: values.currentPassword,
        new_password: values.newPassword,
      });
      notifications.show({
        title: "Success",
        message: "Password updated successfully",
        color: "green",
      });
      form.reset();
    } catch (err) {
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Update failed",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card withBorder shadow="sm" radius="md" p="lg">
      <Title order={3} mb={4}>
        Security
      </Title>
      <Text size="sm" c="dimmed" mb="lg">
        Change your password
      </Text>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="md" maw={400}>
          <PasswordInput
            label="Current Password"
            key={form.key("currentPassword")}
            {...form.getInputProps("currentPassword")}
          />
          <PasswordInput
            label="New Password"
            placeholder="Min. 8 characters"
            key={form.key("newPassword")}
            {...form.getInputProps("newPassword")}
          />
          <PasswordInput
            label="Confirm New Password"
            key={form.key("confirmPassword")}
            {...form.getInputProps("confirmPassword")}
          />
          <Button type="submit" disabled={submitting} loading={submitting} w="fit-content">
            {submitting ? "Updating..." : "Update password"}
          </Button>
        </Stack>
      </form>
    </Card>
  );
}
