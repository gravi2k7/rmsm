"use client";

import { useAuthStore } from "@/lib/auth-store";
import { useOrganizationStore } from "@/lib/organization-store";
import type { RequestContext } from "@/lib/api-client";

/**
 * Returns the canonical authenticated organization request context.
 *
 * The authenticated application state is the source of truth:
 *   - accessToken      -> auth-store
 *   - organizationId  -> active organization store
 *
 * The legacy session-store must not be required for normal application
 * requests. It exists only as a compatibility bridge for older tooling.
 */
export function useRequestContext(): RequestContext | null {
  const accessToken = useAuthStore((state) => state.accessToken);
  const organizationId = useOrganizationStore(
    (state) => state.activeOrganization?.id ?? null,
  );

  if (!organizationId || !accessToken) {
    return null;
  }

  return {
    organizationId,
    accessToken,
  };
}
