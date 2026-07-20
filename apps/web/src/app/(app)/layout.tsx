"use client";

import { useState, type ReactNode } from "react";
import { AuthGuard } from "@/components/providers/auth-guard";
import { SessionExpiredDialog } from "@/components/providers/session-expired-dialog";
import { Sidebar } from "@/components/layout/sidebar";
import { Topnav } from "@/components/layout/topnav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useSessionTimeout } from "@/hooks/use-session-timeout";

export default function AppLayout({ children }: { children: ReactNode }) {
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
    </AuthGuard>
  );
}
