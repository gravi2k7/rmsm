"use client";

import { useSessionStore } from "@/lib/session-store";
import type { RequestContext } from "@/lib/api-client";

/** Returns a ready `RequestContext` once both org id and access token are
 * present in the session store, otherwise `null` — callers gate on this
 * to show the "connect a session" prompt instead of firing requests. */
export function useRequestContext(): RequestContext | null {
  const organizationId = useSessionStore((s) => s.organizationId);
  const accessToken = useSessionStore((s) => s.accessToken);
  if (!organizationId || !accessToken) return null;
  return { organizationId, accessToken };
}
