"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, Stack, Title, Text } from "@mantine/core";
import { ThemeSwitch } from "@/components/settings/theme-switch";
import { ProfileForm } from "@/components/settings/profile-form";
import { PasswordForm } from "@/components/settings/password-form";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";

export function SettingsTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "appearance";

  function onTabChange(value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <Tabs value={activeTab} onChange={onTabChange} maw={720}>
      <Tabs.List>
        <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
        <Tabs.Tab value="profile">Profile</Tabs.Tab>
        <Tabs.Tab value="security">Security</Tabs.Tab>
        <Tabs.Tab value="danger">Danger Zone</Tabs.Tab>
        <Tabs.Tab value="about">About</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="appearance" pt="xl">
        <ThemeSwitch />
      </Tabs.Panel>

      <Tabs.Panel value="profile" pt="xl">
        <ProfileForm />
      </Tabs.Panel>

      <Tabs.Panel value="security" pt="xl">
        <PasswordForm />
      </Tabs.Panel>

      <Tabs.Panel value="danger" pt="xl">
        <DeleteAccountSection />
      </Tabs.Panel>

      <Tabs.Panel value="about" pt="xl">
        <Stack gap="sm">
          <Title order={4}>About this project</Title>
          <Text size="sm" c="dimmed">
            Built with FastAPI + Authentik + Next.js
          </Text>
          <Stack gap={4}>
            <Text size="sm">
              <Text component="span" c="dimmed">Backend:</Text>{" "}
              FastAPI + SQLAlchemy 2.0 + Celery
            </Text>
            <Text size="sm">
              <Text component="span" c="dimmed">Auth:</Text>{" "}
              Authentik (self-hosted OIDC)
            </Text>
            <Text size="sm">
              <Text component="span" c="dimmed">Frontend:</Text>{" "}
              Next.js 16+ / React 19
            </Text>
            <Text size="sm">
              <Text component="span" c="dimmed">UI:</Text>{" "}
              Mantine
            </Text>
            <Text size="sm">
              <Text component="span" c="dimmed">Database:</Text>{" "}
              PostgreSQL
            </Text>
          </Stack>
        </Stack>
      </Tabs.Panel>
    </Tabs>
  );
}
