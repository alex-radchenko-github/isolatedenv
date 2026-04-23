"use client";

import Link from "next/link";
import {
  AppShell,
  Anchor,
  Breadcrumbs,
  Burger,
  Group,
  Stack,
  Text,
  Title,
  Box,
} from "@mantine/core";
import { HeaderActions } from "@/components/header-actions";

interface DashboardHeaderProps {
  opened: boolean;
  toggle: () => void;
}

/** AppShell.Header rendered inside the dashboard layout. */
export function DashboardHeader({ opened, toggle }: DashboardHeaderProps) {
  return (
    <AppShell.Header>
      <Group h="100%" px="md" justify="space-between">
        <Group gap="sm">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        </Group>
        <HeaderActions />
      </Group>
    </AppShell.Header>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

/** Page-level header with title, description, breadcrumbs and actions. */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <Stack gap="xs" px="lg" pt="sm">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs>
          {breadcrumbs.map((crumb) =>
            crumb.href ? (
              <Anchor component={Link} href={crumb.href} key={crumb.label} size="sm">
                {crumb.label}
              </Anchor>
            ) : (
              <Text size="sm" key={crumb.label}>
                {crumb.label}
              </Text>
            ),
          )}
        </Breadcrumbs>
      )}
      <Group justify="space-between" align="flex-start">
        <Box>
          <Title order={2}>{title}</Title>
          {description && (
            <Text c="dimmed" mt={4}>
              {description}
            </Text>
          )}
        </Box>
        {actions && <Group gap="sm">{actions}</Group>}
      </Group>
    </Stack>
  );
}
