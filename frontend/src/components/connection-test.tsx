"use client";

import { IconRefresh } from "@tabler/icons-react";
import {
  Card,
  Title,
  Text,
  Badge,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Loader,
} from "@mantine/core";
import { useConnectionTest } from "@/hooks/use-connection-test";

export function ConnectionTest() {
  const { services, testing, runTests } = useConnectionTest();

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>Connection Status</Title>
        <Button
          variant="outline"
          size="sm"
          onClick={runTests}
          disabled={testing}
          leftSection={
            testing ? (
              <Loader size={14} />
            ) : (
              <IconRefresh size={16} stroke={1.5} />
            )
          }
        >
          Refresh
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {services.map((service) => (
          <Card key={service.name} withBorder shadow="sm" radius="md" p="md">
            <Group justify="space-between" mb={service.responseTime !== undefined ? 4 : 0}>
              <Text size="md" fw={600}>
                {service.name}
              </Text>
              <Badge
                color={
                  service.status === "ok"
                    ? "green"
                    : service.status === "no-auth"
                      ? "yellow"
                      : "red"
                }
                variant="filled"
              >
                {service.status === "no-auth" ? "no auth" : service.status}
              </Badge>
            </Group>
            {service.responseTime !== undefined && (
              <Text size="sm" c="dimmed" mb="sm">
                {service.responseTime}ms
              </Text>
            )}
            {service.details && (
              <SimpleGrid cols={2} spacing={4}>
                {Object.entries(service.details).map(([key, value]) => (
                  <Group key={key} gap={4}>
                    <Text size="sm" c="dimmed" tt="capitalize">
                      {key}
                    </Text>
                    <Badge
                      size="sm"
                      variant={value === "ok" ? "outline" : "light"}
                    >
                      {value}
                    </Badge>
                  </Group>
                ))}
              </SimpleGrid>
            )}
          </Card>
        ))}

        {services.length === 0 && !testing && (
          <Text c="dimmed" ta="center" py="xl" style={{ gridColumn: "1 / -1" }}>
            Click Refresh to test connections
          </Text>
        )}

        {testing && services.length === 0 && (
          <Text c="dimmed" ta="center" py="xl" style={{ gridColumn: "1 / -1" }}>
            Testing connections...
          </Text>
        )}
      </SimpleGrid>
    </Stack>
  );
}
