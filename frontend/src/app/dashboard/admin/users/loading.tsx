import { Skeleton, Stack } from "@mantine/core";

export default function AdminUsersLoading() {
  return (
    <Stack gap="lg" p="lg">
      <Stack gap="xs">
        <Skeleton height={32} width={192} />
        <Skeleton height={16} width={288} />
      </Stack>
      <Skeleton height={40} width={256} />
      <Stack gap="xs">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={64} radius="md" />
        ))}
      </Stack>
    </Stack>
  );
}
