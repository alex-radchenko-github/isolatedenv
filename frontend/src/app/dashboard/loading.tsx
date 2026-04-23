import { Skeleton, Stack, SimpleGrid } from "@mantine/core";

export default function DashboardLoading() {
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
