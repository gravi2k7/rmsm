import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OrganizationState {
  organizationId: string | null;
  setOrganizationId: (organizationId: string) => void;
  clear: () => void;
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set) => ({
      organizationId: null,

      setOrganizationId: (organizationId) => set({ organizationId }),

      clear: () => set({ organizationId: null }),
    }),
    { name: "rmsm-admin-organization" },
  ),
);
