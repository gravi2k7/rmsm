"use client";

import { LineChart } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@rmsm/ui";
import { NavList } from "./nav-list";

export function MobileNav({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex flex-col p-0">
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LineChart className="h-4 w-4" aria-hidden="true" />
            </div>
            RMSM Admin
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <NavList onNavigate={() => onOpenChange(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
