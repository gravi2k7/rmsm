"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";

/** Hides `children` (rendering `fallback` instead, or nothing) when the
 * current trader lacks `permission`. Purely a UX convenience — hiding a
 * button for an action the trader can't perform anyway — never a security
 * boundary, since every mutating endpoint enforces its own permission
 * check server-side regardless of what the client renders. */
export function PermissionGuard({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const hasPermission = useAuthStore((s) => s.hasPermission(permission));
  return <>{hasPermission ? children : fallback}</>;
}

/** Gates an entire page: redirects to `/forbidden` if the current trader
 * lacks `permission`. Like `PermissionGuard`, this is a UX nicety (avoid
 * rendering a page whose every request will 403) — the API is still the
 * real enforcement point. */
export function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
  const router = useRouter();
  const hasPermission = useAuthStore((s) => s.hasPermission(permission));

  useEffect(() => {
    if (!hasPermission) {
      router.replace("/forbidden");
    }
  }, [hasPermission, router]);

  if (!hasPermission) return null;
  return <>{children}</>;
}
