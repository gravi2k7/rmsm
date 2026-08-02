"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAccessibleOrganizations } from "@/features/billing-shared/hooks/use-accessible-organizations";
import { useOrgFanout } from "@/features/billing-shared/hooks/use-org-fanout";
import type { OrganizationSubscriptionWithPlan } from "@/features/billing-shared/types";

export function useCustomerSubscriptions() {
  const organizations = useAccessibleOrganizations();
  const rows = useOrgFanout<OrganizationSubscriptionWithPlan>(
    organizations.data?.items,
    (id) => `/billing/organizations/${id}/subscription`,
    "billing-subscription",
  );
  return { rows, organizationsQuery: organizations };
}

export function useChangeSubscriptionPlan(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planKey: string) => api.patch(`/billing/organizations/${organizationId}/subscription`, { planKey }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing-subscription", organizationId] }),
  });
}

export function useCancelSubscription(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/billing/organizations/${organizationId}/subscription`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing-subscription", organizationId] }),
  });
}
