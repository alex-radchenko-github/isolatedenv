"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconFileText,
  IconBell,
  IconSettings,
} from "@tabler/icons-react";
import { Paper, Group, UnstyledButton, Stack, Text } from "@mantine/core";
import { ROUTES } from "@/lib/routes";
import classes from "./mobile-bottom-nav.module.css";

const items = [
  { href: ROUTES.DASHBOARD, icon: IconDashboard, label: "Home" },
  { href: ROUTES.CONTENT_FREE, icon: IconFileText, label: "Content" },
  { href: ROUTES.NOTIFICATIONS, icon: IconBell, label: "Alerts" },
  { href: ROUTES.SETTINGS, icon: IconSettings, label: "Settings" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <Paper
      withBorder
      component="nav"
      hiddenFrom="sm"
      className={classes.nav}
    >
      <Group justify="space-around" h={56} wrap="nowrap">
        {items.map((item) => {
          const isActive =
            item.href === ROUTES.DASHBOARD
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <UnstyledButton
              key={item.href}
              component={Link}
              href={item.href}
              className={classes.navButton}
              px="sm"
              py={6}
            >
              <Stack align="center" gap={2}>
                <item.icon
                  size={20}
                  stroke={1.5}
                  color={
                    isActive
                      ? "var(--mantine-color-blue-filled)"
                      : "var(--mantine-color-dimmed)"
                  }
                />
                <Text
                  size="xs"
                  c={isActive ? "blue" : "dimmed"}
                >
                  {item.label}
                </Text>
              </Stack>
            </UnstyledButton>
          );
        })}
      </Group>
    </Paper>
  );
}
