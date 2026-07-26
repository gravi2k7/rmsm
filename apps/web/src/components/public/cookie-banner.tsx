"use client";

import { useState } from "react";
import { Button } from "@rmsm/ui";
import { useConsent } from "@/components/providers/consent-provider";
import { cookieConfig } from "@/config";

/**
 * Cookie consent UI (Task 6). Reads/writes decisions through
 * `useConsent()` (components/providers/consent-provider.tsx) — this
 * component owns no persistence logic itself. "Preferences" only expands an
 * inline, disabled list of categories for this milestone; a real
 * per-category opt-in is later work once there's a second category besides
 * "necessary" to actually gate.
 */
export function CookieBanner() {
  const { status, isReady, accept, reject } = useConsent();
  const [showPreferences, setShowPreferences] = useState(false);

  if (!isReady || status !== "pending") return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90"
    >
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{cookieConfig.message}</p>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPreferences((v) => !v)} aria-expanded={showPreferences}>
              Preferences
            </Button>
            <Button variant="outline" size="sm" onClick={reject}>
              Reject
            </Button>
            <Button size="sm" onClick={accept}>
              Accept
            </Button>
          </div>
        </div>

        {showPreferences ? (
          <ul className="mt-4 space-y-2 border-t border-border pt-4">
            {cookieConfig.categories.map((category) => (
              <li key={category.key} className="flex items-start justify-between gap-4 text-sm">
                <div>
                  <p className="font-medium">{category.label}</p>
                  <p className="text-muted-foreground">{category.description}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{category.required ? "Always on" : "Not yet available"}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
