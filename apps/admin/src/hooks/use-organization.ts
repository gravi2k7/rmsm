"use client";

import { useEffect } from "react";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { useOrganizationStore } from "@/lib/organization-store";

export function useOrganization() {
  const organizations = useOrganizations();

  const organizationId = useOrganizationStore((s) => s.organizationId);
  const setOrganizationId = useOrganizationStore((s) => s.setOrganizationId);
  const clear = useOrganizationStore((s) => s.clear);

  const selectedOrganization =
    organizations.data?.items.find((organization) => organization.id === organizationId) ?? null;

  useEffect(() => {
    if (!organizations.data) return;

    const available = organizations.data.items;

    if (available.length === 0) {
      clear();
      return;
    }

    const selectedStillAvailable = available.some(
      (organization) => organization.id === organizationId,
    );

    if (!selectedStillAvailable) {
      setOrganizationId(available[0]!.id);
    }
  }, [organizations.data, organizationId, setOrganizationId, clear]);

  return {
    organizations: organizations.data?.items ?? [],
    selectedOrganization,
    organizationId: selectedOrganization?.id ?? null,
    isLoading: organizations.isLoading,
    error: organizations.error,
    refetch: organizations.refetch,
    setOrganizationId,
  };
}
