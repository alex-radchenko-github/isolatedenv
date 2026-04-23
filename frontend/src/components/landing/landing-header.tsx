"use client";

import Link from "next/link";
import { IconMenu2 } from "@tabler/icons-react";
import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { SidebarThemeToggle } from "@/components/sidebar-theme-toggle";
import { ROUTES } from "@/lib/routes";
import classes from "./landing-header.module.css";

interface LandingHeaderProps {
  isLoggedIn: boolean;
}

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
] as const;

export function LandingHeader({ isLoggedIn }: LandingHeaderProps) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <Box component="header" pos="sticky" top={0} className={classes.header}>
      <Container size="lg">
        <Group h={64} justify="space-between">
          <Anchor component={Link} href={ROUTES.HOME} underline="never">
            <Text fw={700} size="lg">
              isolatedenv
            </Text>
          </Anchor>

          {/* Desktop nav */}
          <Group gap="lg" visibleFrom="md">
            {NAV_LINKS.map((link) => (
              <Anchor
                key={link.href}
                href={link.href}
                size="sm"
                c="dimmed"
                underline="hover"
              >
                {link.label}
              </Anchor>
            ))}

            <SidebarThemeToggle />

            {isLoggedIn ? (
              <Button component={Link} href={ROUTES.DASHBOARD}>
                Dashboard
              </Button>
            ) : (
              <Group gap="xs">
                <Button
                  variant="subtle"
                  component={Link}
                  href={ROUTES.AUTH_AUTHORIZE}
                >
                  Log in
                </Button>
                <Button component={Link} href={ROUTES.AUTH_AUTHORIZE}>
                  Sign up
                </Button>
              </Group>
            )}
          </Group>

          {/* Mobile nav */}
          <Group gap="xs" hiddenFrom="md">
            <SidebarThemeToggle />
            <ActionIcon variant="subtle" onClick={open} aria-label="Open menu">
              <IconMenu2 size={20} stroke={1.5} />
            </ActionIcon>
          </Group>
        </Group>
      </Container>

      <Drawer
        opened={opened}
        onClose={close}
        title={
          <Text fw={700}>isolatedenv</Text>
        }
        position="right"
        size="xs"
      >
        <Stack gap="md" mt="md">
          {NAV_LINKS.map((link) => (
            <Anchor
              key={link.href}
              href={link.href}
              onClick={close}
              size="sm"
              c="dimmed"
              underline="hover"
            >
              {link.label}
            </Anchor>
          ))}
          <Divider />
          {isLoggedIn ? (
            <Button component={Link} href={ROUTES.DASHBOARD} fullWidth>
              Dashboard
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                component={Link}
                href={ROUTES.AUTH_AUTHORIZE}
                fullWidth
              >
                Log in
              </Button>
              <Button component={Link} href={ROUTES.AUTH_AUTHORIZE} fullWidth>
                Sign up
              </Button>
            </>
          )}
        </Stack>
      </Drawer>
    </Box>
  );
}
