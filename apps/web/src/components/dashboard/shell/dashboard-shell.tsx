"use client";

import { useState, type ReactNode } from "react";
import { AuthGuard } from "@/components/providers/auth-guard";
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
export function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useSessionTimeout();

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topnav onOpenMobileNav={() => setMobileNavOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
      <SessionExpiredDialog />
      <CommandPalette />
    </AuthGuard>
  );
}
