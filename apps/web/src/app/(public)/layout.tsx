import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { SkipLink } from "@rmsm/ui";
import { AnnouncementBar, Breadcrumbs, Footer, Header } from "@/components/public";
import { AnalyticsProvider } from "@/components/providers/analytics-provider";
import { ConsentProvider } from "@/components/providers/consent-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { buildMetadata } from "@/lib/seo";

// Deferred: only relevant once consent is still "pending" (most first-time
// visits after the initial decision, none at all), so it doesn't need to be
// in the initial bundle every public page ships (Task 12: lazy load).
const CookieBanner = dynamic(() => import("@/components/public/cookie-banner").then((m) => m.CookieBanner), { ssr: false });

/**
 * Public marketing shell (WM-001R Task 2 / WM-002R full shell). Deliberately
 * separate from `(app)/layout.tsx` — that layout owns `AuthGuard`, the
 * dashboard chrome, and session handling, none of which belong here. Reuses
 * the existing `ThemeProvider` (previously defined but unmounted anywhere in
 * the app) rather than introducing a second theme system, per the "never
 * duplicate providers" rule. `SkipLink` is `@rmsm/ui`'s existing
 * skip-to-content component, not a new one (Task 11 accessibility).
 */
export const metadata = buildMetadata();

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AnalyticsProvider>
        <ConsentProvider>
          <SkipLink />
          <AnnouncementBar />
          <Header />
          <Breadcrumbs />
          <main id="main-content">{children}</main>
          <Footer />
          <CookieBanner />
        </ConsentProvider>
      </AnalyticsProvider>
    </ThemeProvider>
  );
}
