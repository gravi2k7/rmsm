"use client";

import { useEffect } from "react";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { useOrganizationStore } from "@/lib/organization-store";
import { useSessionStore } from "@/lib/session-store";

export function OrganizationBootstrap() {
  const organizationsQuery = useOrganizations();

  const activeOrganization = useOrganizationStore(
    (state) => state.activeOrganization,
  );
  const setActiveOrganization = useOrganizationStore(
    (state) => state.setActiveOrganization,
  );
  const setAvailableOrganizations = useOrganizationStore(
    (state) => state.setAvailableOrganizations,
  );

  const sessionOrganizationId = useSessionStore(
    (state) => state.organizationId,
  );
  const setSessionOrganizationId = useSessionStore(
    (state) => state.setOrganizationId,
  );

  useEffect(() => {
    const organizations = organizationsQuery.data?.items ?? [];

    if (organizations.length === 0) {
      if (!organizationsQuery.isLoading) {
        setAvailableOrganizations([]);
        setActiveOrganization(null);
      }
      return;
    }

    setAvailableOrganizations(organizations);

    const sessionMatch = sessionOrganizationId
      ? organizations.find(
          (organization) => organization.id === sessionOrganizationId,
        )
      : undefined;

    const currentMatch = activeOrganization
      ? organizations.find(
          (organization) => organization.id === activeOrganization.id,
        )
      : undefined;

    const selected =
      sessionMatch ??
      currentMatch ??
      organizations[0]!;

    setActiveOrganization(selected);

    if (sessionOrganizationId !== selected.id) {
      setSessionOrganizationId(selected.id);
    }
  }, [
    organizationsQuery.data,
    organizationsQuery.isLoading,
    sessionOrganizationId,
    activeOrganization,
    setAvailableOrganizations,
    setActiveOrganization,
    setSessionOrganizationId,
  ]);

  return null;
}
