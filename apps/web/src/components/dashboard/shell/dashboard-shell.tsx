"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AuthGuard } from "@/components/providers/auth-guard";
import { OrganizationBootstrap } from "@/components/providers/organization-bootstrap";
import { SessionExpiredDialog } from "@/components/providers/session-expired-dialog";
import { Sidebar } from "@/components/layout/sidebar";
import { Topnav } from "@/components/layout/topnav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { useSessionTimeout } from "@/hooks/use-session-timeout";

/**
 * DashboardShell — UD-001.1 Phase 1.
 *
 * The single shell every dashboard route renders through. Its
 * composition (AuthGuard → Sidebar + MobileNav + Topnav + main +
 * SessionExpiredDialog + CommandPalette) is unchanged from what
 * `app/(app)/layout.tsx` already assembled inline — this extraction
 * doesn't alter behavior for a single existing route, it names and
 * relocates the existing tree so future modules (Organization, Billing,
 * Licensing, Market Data, Broker, AI, Reports, Settings — per the
 * UD-001.1 spec's own list) render through this one component instead of
 * each defining its own layout, which the spec explicitly forbids
 * ("No module may create its own layout").
 *
 * `(app)/layout.tsx` now renders this directly. A later route group
 * (e.g. a literal `(dashboard)` group, if one is ever introduced) can
 * import the same component with zero duplication.
 */
interface DashboardShellProps {
  children: ReactNode;
  compactMain?: boolean;
}

export function DashboardShell({ children, compactMain = false }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  const isMarketRoute = pathname === "/market" || pathname.startsWith("/market/");

  const isTradingRoute = pathname === "/trading" || pathname.startsWith("/trading/");

  useSessionTimeout();

  return (
    <AuthGuard>
      <OrganizationBootstrap />

      <div className="rmsm-mobile-glass-shell flex min-h-0 min-h-screen">
        <Sidebar />
        <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {!isTradingRoute ? <Topnav onOpenMobileNav={() => setMobileNavOpen(true)} /> : null}
          <main
            className={
              isTradingRoute
                ? "min-h-0 flex-1 overflow-hidden p-1"
                : compactMain || isMarketRoute
                  ? "min-h-0 flex-1 overflow-y-auto p-1"
                  : "min-h-0 flex-1 overflow-y-auto p-4 md:p-6"
            }
          >
            {children}
          </main>
        </div>
      </div>
      <SessionExpiredDialog />
      <CommandPalette />
    </AuthGuard>
  );
}
