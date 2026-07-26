"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, VisuallyHidden } from "@rmsm/ui";

/**
 * Global search placeholder (Task 8). No backend search exists yet — this
 * only wires the entry points a real implementation will need later:
 * a visible trigger button, the Cmd/Ctrl+K shortcut, and a dialog shell.
 * Deliberately separate from the authenticated app's `CommandPalette`
 * (components/command-palette/command-palette.tsx), which is a different,
 * auth-gated component that searches real instruments/pages — this one
 * intentionally does nothing yet.
 */
export function SearchTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Search"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-xs sm:inline">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
            <VisuallyHidden>Global search — not yet connected to any results.</VisuallyHidden>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Search is coming soon.</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
