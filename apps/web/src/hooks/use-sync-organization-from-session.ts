"use client";

import { useEffect } from "react";
import { useSessionStore } from "@/lib/session-store";
import { useOrganizationStore } from "@/lib/organization-store";

/**
 * Bridges the legacy dev "session" store's `organizationId`
 * (`lib/session-store.ts` — the org id a developer/tester pastes in via
 * `SessionBar`, the same value `useRequestContext()` already reads for
 * every org-scoped API call) into the enterprise `useOrganizationStore`
 * contract (`activeOrganization`/`availableOrganizations`) that
 * `OrganizationSwitcher` renders from.
 *
 * Same bridging pattern `lib/api-client.ts`'s `refreshAccessToken()`
 * already uses to connect the real auth store into the session store —
 * this extends that same chain one step further, into the Phase 1
 * `OrganizationState` contract, rather than inventing a new one.
 *
 * There is no "list my organizations" endpoint yet (documented in both
 * `session-store.ts` and `api-client.ts`), so this can only ever surface
 * zero or one organization — the one currently connected — not a real
 * multi-org list. `OrganizationSwitcher` still renders a genuinely
 * functional switcher UI against whatever this produces; it will start
 * showing more than one organization the moment a real list-endpoint and
 * hook exist, with no changes to the switcher itself.
 */
export function useSyncOrganizationFromSession(): void {
  const organizationId = useSessionStore((s) => s.organizationId);
  const setActiveOrganization = useOrganizationStore((s) => s.setActiveOrganization);
  const setAvailableOrganizations = useOrganizationStore((s) => s.setAvailableOrganizations);

  useEffect(() => {
    if (!organizationId) {
      setActiveOrganization(null);
      setAvailableOrganizations([]);
      return;
    }
    // No name-lookup endpoint exists for an arbitrary organization id
    // either (confirmed — `OrganizationMembership`/session-store carry no
    // name field), so name/slug fall back to the id itself rather than
    // inventing a display name.
    const organization = { id: organizationId, name: organizationId, slug: organizationId };
    setActiveOrganization(organization);
    setAvailableOrganizations([organization]);
  }, [organizationId, setActiveOrganization, setAvailableOrganizations]);
}
