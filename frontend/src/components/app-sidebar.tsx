"use client";

import {
  IconDashboard,
  IconSettings,
  IconBell,
  IconLogout,
  IconFileText,
  IconLock,
  IconShield,
  IconClipboard,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppShell,
  NavLink,
  Avatar,
  Badge,
  Divider,
  Group,
  Menu,
  ScrollArea,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useMounted } from "@mantine/hooks";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { useUser } from "@/hooks/use-user";
import { ROUTES } from "@/lib/routes";
import { getRoleBadgeColor, getRoleLabel } from "@/lib/rbac";
import type { UserRole } from "@/types/user";
import { SidebarThemeToggle } from "@/components/sidebar-theme-toggle";
import type { Icon } from "@tabler/icons-react";
import classes from "./app-sidebar.module.css";

interface NavItem {
  title: string;
  href: string;
  icon: Icon;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: ROUTES.DASHBOARD, icon: IconDashboard },
  { title: "Free Content", href: ROUTES.CONTENT_FREE, icon: IconFileText },
  { title: "Paid Content", href: ROUTES.CONTENT_PAID, icon: IconLock, roles: ["paid", "admin"] },
  { title: "Users", href: ROUTES.ADMIN_USERS, icon: IconShield, roles: ["admin"] },
  { title: "Audit Log", href: ROUTES.ADMIN_AUDIT_LOG, icon: IconClipboard, roles: ["admin"] },
  { title: "Notifications", href: ROUTES.NOTIFICATIONS, icon: IconBell },
  { title: "Settings", href: ROUTES.SETTINGS, icon: IconSettings },
];

export function AppNavbar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { data: user, isLoading: userLoading } = useUser();
  const { role, isLoading: roleLoading, hasRole } = useRole();
  const mounted = useMounted();

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (!mounted || roleLoading) return false;
    return item.roles.some((r) => hasRole(r));
  });

  return (
    <AppShell.Navbar p="sm">
      <AppShell.Section>
        <Group px="xs" py="sm">
          <Text fw={700} size="lg">isolatedenv</Text>
        </Group>
        <Divider />
      </AppShell.Section>

      <AppShell.Section grow component={ScrollArea} mt="sm">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.href}
            component={Link}
            href={item.href}
            label={item.title}
            leftSection={<item.icon size={18} stroke={1.5} />}
            active={
              item.href === ROUTES.DASHBOARD
                ? pathname === item.href
                : pathname.startsWith(item.href)
            }
            variant="light"
          />
        ))}
      </AppShell.Section>

      <AppShell.Section>
        <Divider mb="sm" />
        <Group justify="center" mb="sm">
          <SidebarThemeToggle />
        </Group>
        <Menu position="top-start" width={220}>
          <Menu.Target>
            <UnstyledButton w="100%" px="xs" py="sm" className={classes.userButton}>
              <Group gap="sm" wrap="nowrap">
                <Avatar size="sm" radius="xl" color={mounted && user ? "initials" : undefined} name={mounted ? user?.name : undefined} />
                <div className={classes.userInfo}>
                  <Group gap={6} wrap="nowrap">
                    <Text size="sm" fw={500} truncate>
                      {mounted ? (user?.name ?? "Loading...") : "Loading..."}
                    </Text>
                    {mounted && user && (
                      <Tooltip label={
                        role === "admin" ? "Full access to all features and user management" :
                        role === "paid" ? "Access to premium content and features" :
                        "Access to free content only"
                      }>
                        <Badge size="xs" variant="light" color={getRoleBadgeColor(role)}>
                          {getRoleLabel(role)}
                        </Badge>
                      </Tooltip>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed" truncate>
                    {mounted ? (user?.email ?? "") : ""}
                  </Text>
                </div>
              </Group>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
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
      </AppShell.Section>
    </AppShell.Navbar>
  );
}
