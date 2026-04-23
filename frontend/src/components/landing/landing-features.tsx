import { IconBolt, IconShield, IconChartBar } from "@tabler/icons-react";
import {
  Card,
  Container,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Divider,
  Box,
} from "@mantine/core";

const FEATURES = [
  {
    icon: IconBolt,
    title: "Lightning Fast",
    description:
      "Built on modern infrastructure with edge computing and smart caching for sub-second response times.",
  },
  {
    icon: IconShield,
    title: "Secure by Default",
    description:
      "Enterprise-grade security with JWT authentication, role-based access control, and encrypted data at rest.",
  },
  {
    icon: IconChartBar,
    title: "Powerful Analytics",
    description:
      "Real-time dashboards, detailed reports, and actionable insights to help you make data-driven decisions.",
  },
] as const;

export function LandingFeatures() {
  return (
    <Box component="section" id="features" py={{ base: 80, sm: 112 }}>
      <Divider mb={{ base: 80, sm: 112 }} />
      <Container size="lg">
        <Stack align="center" gap="md" mb={64} maw={512} mx="auto">
          <Title order={2} ta="center" fz={{ base: 30, sm: 36 }}>
            Everything you need
          </Title>
          <Text size="lg" c="dimmed" ta="center">
            A complete platform with all the tools to build, launch, and grow
            your project.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {FEATURES.map((feature) => (
            <Card key={feature.title} withBorder padding="lg" radius="md">
              <ThemeIcon size={40} radius="md" variant="light" mb="sm">
                <feature.icon size={20} stroke={1.5} />
              </ThemeIcon>
              <Title order={3} mb="xs">
                {feature.title}
              </Title>
              <Text size="sm" c="dimmed">
                {feature.description}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
