import type { Metadata } from "next";
import { cookies } from "next/headers";

import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: "isolatedenv",
  description: "My awesome project",
};

const containerStyle = { display: "flex", minHeight: "100vh", flexDirection: "column" as const };
const mainStyle = { flex: 1 };

export default async function HomePage() {
  const cookieStore = await cookies();
  const isLoggedIn = !!cookieStore.get("session");

  return (
    <div style={containerStyle}>
      <LandingHeader isLoggedIn={isLoggedIn} />
      <main style={mainStyle}>
        <LandingHero isLoggedIn={isLoggedIn} />
        <LandingFeatures />
        <LandingPricing isLoggedIn={isLoggedIn} />
      </main>
      <LandingFooter />
    </div>
  );
}
