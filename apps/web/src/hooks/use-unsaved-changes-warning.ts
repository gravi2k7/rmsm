"use client";

import { useEffect } from "react";

/**
 * Browser-level "are you sure you want to leave" guard via `beforeunload`.
 * Next.js App Router has no stable, public API to intercept in-app client-
 * side navigation (Link clicks) short of wrapping every navigation call
 * site — a real, named gap for this milestone. In-app navigation should
 * instead route through an explicit "Save draft" / "Discard" affordance
 * in the form itself (see `rule-builder-page.tsx`), which this hook
 * complements rather than replaces.
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);
}
