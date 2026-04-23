import Link from "next/link";
import { Center, Stack, Title, Text } from "@mantine/core";

export default function NotFound() {
  return (
    <Center mih="100vh">
      <Stack align="center" gap="md">
        <Title order={2}>404 -- Page Not Found</Title>
        <Text c="dimmed">The page you are looking for does not exist.</Text>
        <Link href="/" style={{ fontWeight: 500 }}>Go home</Link>
      </Stack>
    </Center>
  );
}
