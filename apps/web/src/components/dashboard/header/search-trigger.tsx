"use client";

import { Search } from "lucide-react";
import { Button } from "@rmsm/ui";
import { useCommandPaletteStore } from "@/lib/command-palette-store";

/**
 * UD-001.1 Phase 2 — Header "Global Search" affordance.
 *
 * `CommandPalette` (Ctrl/Cmd+K) already searches pages and live
 * instruments — this is a *visible* trigger for the same palette, not a
 * second search implementation. No new search categories (Users,
 * Organizations, Brokers, Reports, AI Conversations from the original
 * UD-001.1 spec) are added here: those domains don't have any searchable
 * data source in this app yet, and inventing results for them would be
 * exactly the "placeholder architecture" the spec forbids. `Symbols`
 * (via `CommandPalette`'s existing instrument search) is the one
 * category that's real today.
 */
export function SearchTrigger() {
  const setOpen = useCommandPaletteStore((s) => s.setOpen);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setOpen(true)}
      className="hidden items-center gap-2 text-muted-foreground sm:flex"
      aria-label="Search"
    >
      <Search className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="hidden md:inline">Search…</span>
      <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] md:inline">Ctrl K</kbd>
    </Button>
  );
}
