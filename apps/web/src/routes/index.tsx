import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "#/components/site-header";
import { Hero } from "#/components/hero";
import { FacilitiesShowcase } from "#/components/facilities-showcase";
import { PublicCalendar } from "#/components/public-calendar";
import { SiteFooter } from "#/components/site-footer";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="flex min-h-screen flex-col" style={{ fontFamily: '"Noto Sans", sans-serif' }}>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <FacilitiesShowcase />
        <PublicCalendar />
      </main>
      <SiteFooter />
    </div>
  );
}
