"use client";

import Link from "next/link";
import { Button, Center } from "@mantine/core";
import { IconFolderQuestion } from "@tabler/icons-react";
import { EmptyState } from "@/components/empty-state";
import { ROUTES } from "@/lib/routes";

export default function DashboardNotFound() {
  return (
    <Center component="main" p="lg" mih="60vh">
      <EmptyState
        icon={IconFolderQuestion}
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        action={
          <Button component={Link} href={ROUTES.DASHBOARD}>
            Back to Dashboard
          </Button>
        }
      />
    </Center>
  );
}
