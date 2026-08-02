"use client";

import { useAccessibleOrganizations } from "@/features/billing-shared/hooks/use-accessible-organizations";
import { useOrgFanout } from "@/features/billing-shared/hooks/use-org-fanout";
import type { Payment, Invoice, PaginatedResult } from "@/features/billing-shared/types";

export function usePaymentsFanout() {
  const organizations = useAccessibleOrganizations();
  const rows = useOrgFanout<PaginatedResult<Payment>>(
    organizations.data?.items,
    (id) => `/billing/organizations/${id}/payments?take=100`,
    "billing-payments",
  );
  return { rows, organizationsQuery: organizations };
}

export function useInvoicesFanout() {
  const organizations = useAccessibleOrganizations();
  const rows = useOrgFanout<PaginatedResult<Invoice>>(
    organizations.data?.items,
    (id) => `/billing/organizations/${id}/invoices?take=100`,
    "billing-invoices",
  );
  return { rows, organizationsQuery: organizations };
}
