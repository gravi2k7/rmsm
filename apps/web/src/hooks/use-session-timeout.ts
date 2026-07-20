import { useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";

const HEARTBEAT_INTERVAL_MS = 60_000;

/**
 * Without this, an idle tab (no user-initiated requests) never discovers
 * its session has expired until the trader tries to do something — which
 * then fails with a confusing error on whatever action they attempted. A
 * periodic no-op authenticated request reuses the api-client's existing
 * 401 -> refresh -> `markSessionExpired()` path, so expiry surfaces as the
 * dedicated Session Expired dialog instead.
 */
export function useSessionTimeout(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      api.get("/auth/me").catch(() => {
        // A failure here already updated the store via the api-client's
        // own refresh handling (markSessionExpired / clear) — nothing
        // further to do from a background heartbeat.
      });
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isAuthenticated]);
}
