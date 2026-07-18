import type { ReactNode } from "react";
import { SkipLink } from "@rmsm/ui";
import { Sidebar } from "./sidebar";
import { SessionBar } from "./session-bar";
import { ThemeToggle } from "./theme-toggle";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
        <span className="text-sm font-semibold tracking-tight">RMSM Strategy Builder</span>
        <div className="flex items-center gap-2">
          <SessionBar />
          <ThemeToggle />
        </div>
      </header>
      <div className="flex flex-1">
        <Sidebar />
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 p-6 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
