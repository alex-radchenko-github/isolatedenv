"use client";

import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { Box, Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { ROUTES } from "@/lib/routes";
import classes from "./landing-hero.module.css";

interface LandingHeroProps {
  isLoggedIn: boolean;
}

const heroPy = { base: 96, sm: 128, lg: 160 };
const heroTitleFz = { base: 36, sm: 48, lg: 56 };

export function LandingHero({ isLoggedIn }: LandingHeroProps) {
  return (
    <Box component="section" py={heroPy} className={classes.hero}>
      <Container size="lg">
        <Stack align="center" gap="lg" maw={640} mx="auto">
          <Title
            order={1}
            ta="center"
            fz={heroTitleFz}
            fw={700}
          >
            isolatedenv
          </Title>
          <Text size="lg" c="dimmed" ta="center" lh={1.8}>
            My awesome project
          </Text>
          <Text size="lg" c="dimmed" ta="center" lh={1.8}>
            Build faster, scale easier, and focus on what matters most — your
            product.
          </Text>
          <Group mt="lg" gap="md" justify="center">
            {isLoggedIn ? (
              <Button
                component={Link}
                href={ROUTES.DASHBOARD}
                size="lg"
                rightSection={<IconArrowRight size={16} stroke={1.5} />}
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  component={Link}
                  href={ROUTES.AUTH_AUTHORIZE}
                  size="lg"
                  rightSection={<IconArrowRight size={16} stroke={1.5} />}
                >
                  Get Started
                </Button>
                <Button
                  component="a"
                  href="#features"
                  size="lg"
                  variant="outline"
                >
                  Learn More
                </Button>
              </>
            )}
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}
