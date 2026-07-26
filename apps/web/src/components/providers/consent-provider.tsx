"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cookieConfig } from "@/config";

/**
 * Cookie consent state (Task 6). Persists the user's decision to
 * localStorage under `cookieConfig.storageKey` so it survives reloads and
 * new sessions. "accepted"/"rejected" only record the decision itself — no
 * analytics SDK is loaded or gated on this yet ("no analytics
 * implementation" per Task 6); that wiring is a later milestone's job once
 * there's something real to gate.
 */
export type ConsentStatus = "pending" | "accepted" | "rejected";

interface ConsentContextValue {
  status: ConsentStatus;
  /** False until localStorage has been read client-side, so the banner
   * can avoid a flash of "pending" before hydration settles. */
  isReady: boolean;
  accept: () => void;
  reject: () => void;
}

const ConsentContext = createContext<ConsentContextValue | undefined>(undefined);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConsentStatus>("pending");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(cookieConfig.storageKey);
      if (stored === "accepted" || stored === "rejected") {
        setStatus(stored);
      }
    } catch {
      // Storage unavailable — treat as still pending for this session.
    } finally {
      setIsReady(true);
    }
  }, []);

  function persist(next: ConsentStatus) {
    setStatus(next);
    try {
      window.localStorage.setItem(cookieConfig.storageKey, next);
    } catch {
      // Storage unavailable — decision holds for this session only.
    }
  }

  const value = useMemo<ConsentContextValue>(
    () => ({
      status,
      isReady,
      accept: () => persist("accepted"),
      reject: () => persist("rejected"),
    }),
    [status, isReady],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within a ConsentProvider");
  }
  return ctx;
}
