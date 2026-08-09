"use client";

import { create } from "zustand";
import type { Organization, OrganizationState } from "@/types/dashboard";

/**
 * Implements the `OrganizationState` contract from `types/dashboard.ts`
 * (Phase 1). A dumb Zustand store, same shape as `useWorkspaceStore` —
 * see that file's header comment for why these don't fetch their own
 * data.
 *
 * Deliberately NOT persisted (unlike `useWorkspaceStore`): its one real
 * data source today is `useSessionStore.organizationId`
 * (`organization-sync.ts`'s `useSyncOrganizationFromSession`), which is
 * itself already persisted — persisting this store too would just be a
 * second, potentially stale copy of the same value.
 */
interface OrganizationStore extends OrganizationState {
  setActiveOrganization: (organization: Organization | null) => void;
  setAvailableOrganizations: (organizations: Organization[]) => void;
}

export const useOrganizationStore = create<OrganizationStore>((set) => ({
  activeOrganization: null,
  availableOrganizations: [],
  setActiveOrganization: (activeOrganization) => set({ activeOrganization }),
  setAvailableOrganizations: (availableOrganizations) => set({ availableOrganizations }),
}));
