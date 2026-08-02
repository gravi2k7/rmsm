"use client";

import { useMemo } from "react";
import { api } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { useAccessibleOrganizations } from "@/features/billing-shared/hooks/use-accessible-organizations";
import { useOrgFanout } from "@/features/billing-shared/hooks/use-org-fanout";
import type { PlatformCounts, OrganizationSubscriptionWithPlan, Invoice, Payment, License, PaginatedResult } from "@/features/billing-shared/types";

/** `admin/dashboard` — the one genuinely platform-wide read this API has. */
export function usePlatformCounts() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => api.get<{ platformStats: PlatformCounts; generatedAt: string }>("/admin/dashboard"),
  });
}

/** `billing/licenses` — also genuinely platform-wide (no org-role guard). */
export function useAllLicenses() {
  return useQuery({
    queryKey: ["billing", "licenses", "all"],
    queryFn: () => api.get<PaginatedResult<License>>("/billing/licenses?pageSize=500"),
  });
}

/**
 * Revenue/MRR/ARR/failed-payments/subscription-growth are not backed by
 * any platform-wide aggregate endpoint (see `billing-shared/types.ts`).
 * Computed here as a best-effort sum over accessible organizations'
 * subscriptions, invoices, and payments — real numbers, honestly scoped,
 * not platform totals. `ScopeBanner` on the page makes that explicit.
 */
export function useBillingDashboardAggregates() {
  const organizations = useAccessibleOrganizations();
  const orgs = organizations.data?.items;

  const subscriptions = useOrgFanout<OrganizationSubscriptionWithPlan>(orgs, (id) => `/billing/organizations/${id}/subscription`, "billing-subscription");
  const invoices = useOrgFanout<{ items: Invoice[]; total: number }>(orgs, (id) => `/billing/organizations/${id}/invoices?take=100`, "billing-invoices");
  const payments = useOrgFanout<{ items: Payment[]; total: number }>(orgs, (id) => `/billing/organizations/${id}/payments?take=100`, "billing-payments");

  const isLoading = organizations.isLoading || subscriptions.some((s) => s.isLoading) || invoices.some((i) => i.isLoading) || payments.some((p) => p.isLoading);

  const aggregates = useMemo(() => {
    let mrrCents = 0;
    let activeSubscriptions = 0;
    let trialAccounts = 0;
    let totalRevenueCents = 0;
    let failedPayments = 0;
    let successfulPayments = 0;

    for (const s of subscriptions) {
      if (!s.data) continue;
      if (s.data.status === "ACTIVE" || s.data.status === "PAST_DUE") activeSubscriptions += 1;
      if (s.data.status === "TRIALING") trialAccounts += 1;
      if (s.data.status === "ACTIVE") {
        mrrCents += s.data.billingCycle === "YEARLY" ? Math.round(s.data.plan.yearlyPriceCents / 12) : s.data.plan.monthlyPriceCents;
      }
    }

    for (const inv of invoices) {
      if (!inv.data) continue;
      for (const item of inv.data.items) {
        if (item.status === "PAID") totalRevenueCents += item.totalCents;
      }
    }

    for (const p of payments) {
      if (!p.data) continue;
      for (const payment of p.data.items) {
        if (payment.status === "FAILED") failedPayments += 1;
        if (payment.status === "SUCCESS") successfulPayments += 1;
      }
    }

    const paymentSuccessRate = successfulPayments + failedPayments > 0 ? (successfulPayments / (successfulPayments + failedPayments)) * 100 : null;

    return {
      mrrCents,
      arrCents: mrrCents * 12,
      activeSubscriptions,
      trialAccounts,
      totalRevenueCents,
      failedPayments,
      paymentSuccessRate,
      accessibleOrgCount: orgs?.length ?? 0,
      restrictedOrgCount: subscriptions.filter((s) => s.restricted).length,
    };
  }, [subscriptions, invoices, payments, orgs]);

  return { aggregates, isLoading, subscriptions, invoices, payments, organizationsQuery: organizations };
}
