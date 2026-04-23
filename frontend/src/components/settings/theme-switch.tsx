"use client";

import {
  Card,
  Group,
  Title,
  Text,
  SegmentedControl,
} from "@mantine/core";
import { useMantineColorScheme } from "@mantine/core";
import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react";

const SCHEMES = ["light", "dark", "auto"] as const;
type Scheme = (typeof SCHEMES)[number];

export function ThemeSwitch() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  function handleChange(value: string) {
    if ((SCHEMES as readonly string[]).includes(value)) {
      setColorScheme(value as Scheme);
    }
  }

  return (
    <Card withBorder shadow="sm" radius="md" p="lg">
      <Title order={3} mb={4}>
        Appearance
      </Title>
      <Text size="sm" c="dimmed" mb="lg">
        Choose your preferred theme
      </Text>

      <SegmentedControl
        value={colorScheme}
        onChange={handleChange}
        data={[
          {
            label: (
              <Group gap={6} wrap="nowrap">
                <IconSun size={16} stroke={1.5} />
                <span>Light</span>
              </Group>
            ),
            value: "light",
          },
          {
            label: (
              <Group gap={6} wrap="nowrap">
                <IconMoon size={16} stroke={1.5} />
                <span>Dark</span>
              </Group>
            ),
            value: "dark",
          },
          {
            label: (
              <Group gap={6} wrap="nowrap">
                <IconDeviceDesktop size={16} stroke={1.5} />
                <span>System</span>
              </Group>
            ),
            value: "auto",
          },
        ]}
      />
    </Card>
  );
}
