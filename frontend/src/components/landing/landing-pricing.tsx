"use client";

import Link from "next/link";
import { IconCheck } from "@tabler/icons-react";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  List,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { ROUTES } from "@/lib/routes";
import classes from "./landing-pricing.module.css";

interface LandingPricingProps {
  isLoggedIn: boolean;
}

const PLANS = [
  {
    name: "Free",
    price: "$0",
    description: "For individuals getting started.",
    features: [
      "Up to 3 projects",
      "Basic analytics",
      "Community support",
      "1 GB storage",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/mo",
    description: "For professionals and growing teams.",
    features: [
      "Unlimited projects",
      "Advanced analytics",
      "Priority support",
      "50 GB storage",
      "Custom integrations",
      "Team collaboration",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For organizations with advanced needs.",
    features: [
      "Everything in Pro",
      "Dedicated support",
      "Custom SLA",
      "Unlimited storage",
      "SSO / SAML",
      "Audit logs",
    ],
    cta: "Contact Sales",
    popular: false,
  },
] as const;

export function LandingPricing({ isLoggedIn }: LandingPricingProps) {
  return (
    <Box component="section" id="pricing" py={{ base: 80, sm: 112 }}>
      <Divider mb={{ base: 80, sm: 112 }} />
      <Container size="lg">
        <Stack align="center" gap="md" mb={64} maw={512} mx="auto">
          <Title order={2} ta="center" fz={{ base: 30, sm: 36 }}>
            Simple, transparent pricing
          </Title>
          <Text size="lg" c="dimmed" ta="center">
            Choose the plan that fits your needs. Upgrade or downgrade at any
            time.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              withBorder
              padding="lg"
              radius="md"
              shadow={plan.popular ? "md" : undefined}
              className={plan.popular ? classes.popularCard : undefined}
            >
              {plan.popular && (
                <Badge className={classes.popularBadge}>
                  Most Popular
                </Badge>
              )}
              <Title order={3}>{plan.name}</Title>
              <Text size="sm" c="dimmed" mb="md">
                {plan.description}
              </Text>
              <Group gap={4} mb="lg">
                <Text fz={36} fw={700}>
                  {plan.price}
                </Text>
                {"period" in plan && (
                  <Text c="dimmed">{plan.period}</Text>
                )}
              </Group>
              <List
                spacing="sm"
                mb="lg"
                icon={
                  <IconCheck
                    size={16}
                    stroke={2}
                    color="var(--mantine-primary-color-filled)"
                  />
                }
              >
                {plan.features.map((feature) => (
                  <List.Item key={feature}>
                    <Text size="sm">{feature}</Text>
                  </List.Item>
                ))}
              </List>
              {isLoggedIn ? (
                <Button
                  component={Link}
                  href={ROUTES.DASHBOARD}
                  variant={plan.popular ? "filled" : "outline"}
                  fullWidth
                >
                  {plan.cta}
                </Button>
              ) : (
                <Button
                  component="a"
                  href={ROUTES.AUTH_AUTHORIZE}
                  variant={plan.popular ? "filled" : "outline"}
                  fullWidth
                >
                  {plan.cta}
                </Button>
              )}
            </Card>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
