"use client";

import { Suspense } from "react";
import { AppShell, SimpleGrid, Skeleton, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AppNavbar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/page-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import SessionGuard from "@/components/session-guard";

function ShellSkeleton() {
  return (
    <Stack gap="lg" p="lg">
      <Stack gap="xs">
        <Skeleton height={32} width={192} />
        <Skeleton height={16} width={288} />
      </Stack>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={128} radius="md" />
        ))}
      </SimpleGrid>
      <Skeleton height={256} radius="md" />
    </Stack>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <SessionGuard>
      <AppShell
        header={{ height: 60 }}
        navbar={{ width: 280, breakpoint: "sm", collapsed: { mobile: !opened } }}
        padding="md"
      >
        <DashboardHeader opened={opened} toggle={toggle} />
        <AppNavbar />
        <AppShell.Main id="main-content" pb={{ base: 80, sm: "md" }}>
          <Suspense fallback={<ShellSkeleton />}>{children}</Suspense>
        </AppShell.Main>
        <MobileBottomNav />
      </AppShell>
    </SessionGuard>
  );
}
