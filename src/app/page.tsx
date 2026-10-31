import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ContextPreview } from "@/components/landing/context-preview";
import { DemoBand } from "@/components/landing/demo-band";
import { Features } from "@/components/landing/features";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Problem } from "@/components/landing/problem";
import { getCurrentUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="relative min-h-dvh">
      <SiteHeader isSignedIn={Boolean(user)} />
      <main id="main">
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <ContextPreview />
        <DemoBand />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
