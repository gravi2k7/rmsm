import type { ReactNode } from "react";
import { AnnouncementBar, CookieBanner, Footer, Header } from "@/components/public";
import { AnalyticsProvider } from "@/components/providers/analytics-provider";
import { ConsentProvider } from "@/components/providers/consent-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { buildMetadata } from "@/lib/seo";

/**
 * Public marketing shell (Task 2). Deliberately separate from
 * `(app)/layout.tsx` — that layout owns `AuthGuard`, the dashboard chrome,
 * and session handling, none of which belong here. Reuses the existing
 * `ThemeProvider` (previously defined but unmounted anywhere in the app)
 * rather than introducing a second theme system, per Task 8/9.
 */
export const metadata = buildMetadata();

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AnalyticsProvider>
        <ConsentProvider>
          <AnnouncementBar />
          <Header />
          <main id="main-content">{children}</main>
          <Footer />
          <CookieBanner />
        </ConsentProvider>
      </AnalyticsProvider>
    </ThemeProvider>
  );
}
