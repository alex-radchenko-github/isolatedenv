"use client";

import { IconBell, IconSearch, IconSettings, IconLogout } from "@tabler/icons-react";
import Link from "next/link";
import {
  ActionIcon,
  Avatar,
  Badge,
  Divider,
  Group,
  Kbd,
  Menu,
  Text,
  Tooltip,
} from "@mantine/core";
import { spotlight } from "@mantine/spotlight";
import { useMounted } from "@mantine/hooks";
import { ROUTES } from "@/lib/routes";
import { useUser } from "@/hooks/use-user";
import { useAuth } from "@/hooks/use-auth";

export function HeaderActions() {
  const { data: user } = useUser();
  const { logout } = useAuth();
  const mounted = useMounted();

  // TODO: Replace with useQuery({ queryKey: ["notifications", "unread"], ... })
  const unreadCount = 0;

  return (
    <Group gap="xs">
      <Tooltip label={<Group gap={4}><Text size="xs">Search</Text><Kbd size="xs">Mod + K</Kbd></Group>}>
        <ActionIcon variant="default" size="lg" onClick={() => spotlight.open()} aria-label="Search">
          <IconSearch size={16} stroke={1.5} />
        </ActionIcon>
      </Tooltip>

      <Tooltip label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}>
        <ActionIcon
          variant="subtle"
          size="lg"
          component={Link}
          href={ROUTES.NOTIFICATIONS}
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
          pos="relative"
        >
          <IconBell size={16} stroke={1.5} />
          {unreadCount > 0 && (
            <Badge
              size="xs"
              circle
              color="red"
              pos="absolute"
              top={-4}
              right={-4}
              style={{ pointerEvents: "none" }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </ActionIcon>
      </Tooltip>

      <Divider orientation="vertical" mx={4} />

      <Menu position="bottom-end" width={220}>
        <Menu.Target>
          <ActionIcon variant="subtle" size="lg" radius="xl" aria-label="User menu">
            <Avatar size="sm" radius="xl" color={mounted && user ? "initials" : undefined} name={mounted ? user?.name : undefined} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {user && (
            <>
              <Menu.Label>
                <Text size="sm" fw={500}>{user.name}</Text>
                <Text size="xs" c="dimmed">{user.email}</Text>
              </Menu.Label>
              <Menu.Divider />
            </>
          )}
          <Menu.Item
            component={Link}
            href={ROUTES.SETTINGS}
            leftSection={<IconSettings size={16} stroke={1.5} />}
          >
            Settings
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            leftSection={<IconLogout size={16} stroke={1.5} />}
            onClick={() => logout()}
          >
            Logout
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
