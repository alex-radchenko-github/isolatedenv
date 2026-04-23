"use client";

import { useState } from "react";
import { useForm, schemaResolver } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  TextInput,
  PasswordInput,
  Button,
  Card,
  Title,
  Text,
  Stack,
  Group,
  Modal,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useUser } from "@/hooks/use-user";
import { getQueryClient } from "@/lib/query-client";
import { updateProfile, updateEmail } from "@/actions/user";
import {
  profileSchema,
  emailChangeSchema,
  type ProfileValues,
  type EmailChangeValues,
} from "@/lib/validations/settings";

export function ProfileForm() {
  const { data: user } = useUser();
  const [emailModalOpened, emailModal] = useDisclosure(false);

  const form = useForm<ProfileValues>({
    mode: "uncontrolled",
    initialValues: { name: user?.name ?? "" },
    validate: schemaResolver(profileSchema),
  });

  const emailForm = useForm<EmailChangeValues>({
    mode: "uncontrolled",
    initialValues: { newEmail: "", password: "" },
    validate: schemaResolver(emailChangeSchema),
  });

  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  async function onSubmitProfile(values: ProfileValues) {
    setProfileSubmitting(true);
    try {
      await updateProfile({ name: values.name });
      const queryClient = getQueryClient();
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      notifications.show({
        title: "Success",
        message: "Profile updated successfully",
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Update failed",
        color: "red",
      });
    } finally {
      setProfileSubmitting(false);
    }
  }

  async function onSubmitEmailChange(values: EmailChangeValues) {
    setEmailSubmitting(true);
    try {
      await updateEmail({
        new_email: values.newEmail,
        password: values.password,
      });
      const queryClient = getQueryClient();
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      notifications.show({
        title: "Success",
        message: "Email updated successfully",
        color: "green",
      });
      emailModal.close();
      emailForm.reset();
    } catch (err) {
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Email update failed",
        color: "red",
      });
    } finally {
      setEmailSubmitting(false);
    }
  }

  return (
    <Card withBorder shadow="sm" radius="md" p="lg">
      <Title order={3} mb={4}>
        Profile
      </Title>
      <Text size="sm" c="dimmed" mb="lg">
        Update your personal information
      </Text>

      <Stack gap="lg">
        <form onSubmit={form.onSubmit(onSubmitProfile)}>
          <Stack gap="md" maw={400}>
            <TextInput
              label="Name"
              key={form.key("name")}
              {...form.getInputProps("name")}
            />
            <Button type="submit" disabled={profileSubmitting} loading={profileSubmitting} w="fit-content">
              {profileSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </Stack>
        </form>

        <Stack gap="xs" maw={400}>
          <Text size="sm" fw={500}>
            Email
          </Text>
          <Group gap="sm">
            <TextInput
              value={user?.email ?? ""}
              disabled
              style={{ flex: 1, opacity: 0.6 }}
            />
            <Button variant="outline" size="sm" onClick={emailModal.open}>
              Change
            </Button>
          </Group>
          <Text size="xs" c="dimmed">
            Email changes require password verification
          </Text>
        </Stack>
      </Stack>

      <Modal
        opened={emailModalOpened}
        onClose={emailModal.close}
        title="Change email"
      >
        <Text size="sm" c="dimmed" mb="md">
          Enter your new email and current password to verify the change.
        </Text>
        <form onSubmit={emailForm.onSubmit(onSubmitEmailChange)}>
          <Stack gap="md">
            <TextInput
              label="New Email"
              type="email"
              placeholder="new@example.com"
              key={emailForm.key("newEmail")}
              {...emailForm.getInputProps("newEmail")}
            />
            <PasswordInput
              label="Current Password"
              key={emailForm.key("password")}
              {...emailForm.getInputProps("password")}
            />
            <Button type="submit" disabled={emailSubmitting} loading={emailSubmitting}>
              {emailSubmitting ? "Updating..." : "Update email"}
            </Button>
          </Stack>
        </form>
      </Modal>
    </Card>
  );
}
