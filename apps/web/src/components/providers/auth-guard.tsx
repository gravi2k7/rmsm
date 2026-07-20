"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { SplashScreen } from "@/components/shared/splash-screen";

/**
 * Wraps the entire `(app)` route group. `useAuthStore` is persisted via
 * localStorage/sessionStorage, which isn't available during SSR/the first
 * client render before hydration — checking `isAuthenticated()`
 * synchronously on first render would either flash the redirect
 * incorrectly or mismatch server/client output. `hasHydrated` gates the
 * check until zustand's `persist` middleware has actually rehydrated from
 * storage, then redirects only once that's settled.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || !isAuthenticated) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
