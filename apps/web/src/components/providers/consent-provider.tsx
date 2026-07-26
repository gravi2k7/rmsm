"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Placeholder (Task 8: "Consent Provider... only add if missing"). Holds
 * the shape a real cookie-consent implementation will need (pairs with
 * `components/public/cookie-banner.tsx`), but no persistence, banner UI, or
 * gating logic yet — this milestone only establishes the provider boundary.
 */
interface ConsentContextValue {
  hasConsented: boolean;
  setHasConsented: (value: boolean) => void;
}

const ConsentContext = createContext<ConsentContextValue | undefined>(undefined);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [hasConsented, setHasConsented] = useState(false);
  const value = useMemo(() => ({ hasConsented, setHasConsented }), [hasConsented]);

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within a ConsentProvider");
  }
  return ctx;
}
