"use client";

import { LineChart } from "lucide-react";
import { NavList } from "./nav-list";

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LineChart className="h-4 w-4" aria-hidden="true" />
        </div>
        <span className="font-semibold">RMSM Admin</span>
      </div>
      <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <NavList />
      </nav>
    </aside>
  );
}
