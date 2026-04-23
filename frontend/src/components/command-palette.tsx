"use client";

import { useRouter } from "next/navigation";
import {
  IconDashboard,
  IconSettings,
  IconBell,
  IconFileText,
  IconLock,
  IconShield,
  IconSun,
  IconMoon,
} from "@tabler/icons-react";
import { Spotlight, type SpotlightActionData } from "@mantine/spotlight";
import { useMantineColorScheme, useComputedColorScheme } from "@mantine/core";
import { useRole } from "@/hooks/use-role";
import { ROUTES } from "@/lib/routes";

export function CommandPalette() {
  const router = useRouter();
  const { hasRole } = useRole();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light");

  const actions: SpotlightActionData[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      description: "Go to dashboard",
      onClick: () => router.push(ROUTES.DASHBOARD),
      leftSection: <IconDashboard size={20} stroke={1.5} />,
      group: "Navigation",
    },
    {
      id: "free-content",
      label: "Free Content",
      description: "Browse free content",
      onClick: () => router.push(ROUTES.CONTENT_FREE),
      leftSection: <IconFileText size={20} stroke={1.5} />,
      group: "Navigation",
    },
    ...(hasRole("paid")
      ? [
          {
            id: "paid-content",
            label: "Paid Content",
            description: "Browse premium content",
            onClick: () => router.push(ROUTES.CONTENT_PAID),
            leftSection: <IconLock size={20} stroke={1.5} />,
            group: "Navigation",
          },
        ]
      : []),
    {
      id: "notifications",
      label: "Notifications",
      description: "View notifications",
      onClick: () => router.push(ROUTES.NOTIFICATIONS),
      leftSection: <IconBell size={20} stroke={1.5} />,
      group: "Navigation",
    },
    ...(hasRole("admin")
      ? [
          {
            id: "admin-users",
            label: "Manage Users",
            description: "Admin user management",
            onClick: () => router.push(ROUTES.ADMIN_USERS),
            leftSection: <IconShield size={20} stroke={1.5} />,
            group: "Admin",
          },
        ]
      : []),
    {
      id: "settings",
      label: "Account Settings",
      description: "Manage your account",
      onClick: () => router.push(ROUTES.SETTINGS),
      leftSection: <IconSettings size={20} stroke={1.5} />,
      group: "Settings",
    },
    {
      id: "toggle-theme",
      label: "Toggle Theme",
      description: computedColorScheme === "dark" ? "Switch to light mode" : "Switch to dark mode",
      onClick: () => setColorScheme(computedColorScheme === "dark" ? "light" : "dark"),
      leftSection: computedColorScheme === "dark"
        ? <IconSun size={20} stroke={1.5} />
        : <IconMoon size={20} stroke={1.5} />,
      group: "Quick Actions",
    },
  ];

  return (
    <Spotlight
      actions={actions}
      nothingFound="No results found."
      highlightQuery
      shortcut={["mod + K"]}
      searchProps={{
        placeholder: "Type a command or search...",
      }}
    />
  );
}
