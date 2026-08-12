"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useOrganization } from "@/hooks/use-organization";

type OrganizationContextValue = ReturnType<typeof useOrganization>;

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const value = useOrganization();

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext(): OrganizationContextValue {
  const context = useContext(OrganizationContext);

  if (!context) {
    throw new Error("useOrganizationContext must be used inside OrganizationProvider");
  }

  return context;
}
