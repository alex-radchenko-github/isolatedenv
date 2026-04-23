import { Anchor, Box, Container, Divider, Group, Text } from "@mantine/core";
import { ROUTES } from "@/lib/routes";
import classes from "./landing-footer.module.css";

export function LandingFooter() {
  return (
    <Box component="footer" className={classes.footer}>
      <Container size="lg" py="xl">
        <Group justify="space-between" wrap="wrap" gap="lg">
          <Anchor href={ROUTES.HOME} underline="never">
            <Text fw={700} size="lg">
              isolatedenv
            </Text>
          </Anchor>

          <Group gap="lg">
            <Anchor href="/terms" size="sm" c="dimmed" underline="hover">
              Terms
            </Anchor>
            <Anchor href="/privacy" size="sm" c="dimmed" underline="hover">
              Privacy
            </Anchor>
            <Anchor href="/contact" size="sm" c="dimmed" underline="hover">
              Contact
            </Anchor>
          </Group>
        </Group>

        <Divider my="lg" />

        <Text size="sm" c="dimmed" ta="center">
          &copy; {new Date().getFullYear()} isolatedenv. All rights
          reserved.
        </Text>
      </Container>
    </Box>
  );
}
