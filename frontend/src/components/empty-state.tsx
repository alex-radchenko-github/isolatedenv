import { IconInbox } from "@tabler/icons-react";
import { Button, Center, Stack, Text, Title, Box } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";
import classes from "./empty-state.module.css";

interface EmptyStateProps {
  icon?: Icon;
  title: string;
  description?: string;
  action?:
    | { label: string; onClick: () => void }
    | React.ReactNode;
}

export function EmptyState({
  icon: Icon = IconInbox,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Center py="xl">
      <Stack align="center" gap="sm">
        <Box
          p="xl"
          className={classes.iconWrapper}
          bg="var(--mantine-color-default-hover)"
        >
          <Box
            p="md"
            className={classes.iconWrapper}
            bg="var(--mantine-color-default)"
          >
            <Icon size={32} stroke={1.5} color="var(--mantine-color-dimmed)" />
          </Box>
        </Box>
        <Title order={3} size="lg" fw={600}>
          {title}
        </Title>
        {description && (
          <Text size="sm" c="dimmed" maw={360} ta="center">
            {description}
          </Text>
        )}
        {action && (
          <Box mt="xs">
            {typeof action === "object" && "label" in action ? (
              <Button onClick={action.onClick}>{action.label}</Button>
            ) : (
              action
            )}
          </Box>
        )}
      </Stack>
    </Center>
  );
}
