import { LandingNav } from "@/components/landing/landing-nav";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingWhatWeDo } from "@/components/landing/landing-what-we-do";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingAbout } from "@/components/landing/landing-about";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingShowcase } from "@/components/landing/landing-showcase";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      <LandingNav />
      <main className="flex-grow">
        <LandingHero />
        <LandingWhatWeDo />
        <LandingHowItWorks />
        <LandingAbout />
        <LandingFeatures />
        <LandingShowcase />
      </main>
      <LandingFooter />
    </div>
  );
}
