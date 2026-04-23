import { Skeleton, Stack } from "@mantine/core";

export default function Loading() {
  return (
    <Stack gap="lg" p="lg">
      <Stack gap="xs">
        <Skeleton height={32} width={192} />
        <Skeleton height={16} width={288} />
      </Stack>
      <Skeleton height={400} radius="md" />
    </Stack>
  );
}
