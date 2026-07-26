import type { ReactNode } from "react";

/**
 * Placeholder (Task 8: "Analytics Provider... only add if missing" — no
 * analytics provider previously existed in apps/web). Establishes the
 * composition slot without loading or initializing any analytics SDK yet.
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
