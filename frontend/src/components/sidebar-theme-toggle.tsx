"use client";

import { useEffect, useState } from "react";
import {
  ActionIcon,
  Group,
  useMantineColorScheme,
  Tooltip,
} from "@mantine/core";
import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react";
import classes from "./sidebar-theme-toggle.module.css";

const themes = [
  { value: "light" as const, icon: IconSun, label: "Light" },
  { value: "dark" as const, icon: IconMoon, label: "Dark" },
  { value: "auto" as const, icon: IconDeviceDesktop, label: "System" },
];

export function SidebarThemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <Group gap={4} p={4} className={classes.toggleGroup}>
      {themes.map((t) => (
        <Tooltip key={t.value} label={t.label} position="bottom" withArrow>
          <ActionIcon
            variant={mounted && colorScheme === t.value ? "filled" : "subtle"}
            size="sm"
            onClick={() => setColorScheme(t.value)}
            aria-label={t.label}
          >
            <t.icon size={14} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
      ))}
    </Group>
  );
}
