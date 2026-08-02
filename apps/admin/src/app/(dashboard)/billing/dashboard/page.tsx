"use client";

import { DollarSign, Users, Timer, TrendingUp, Landmark, AlertTriangle, KeyRound, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ScopeBanner } from "@/features/billing-shared/components/scope-banner";
import { formatCents, formatPercent } from "@/features/billing-shared/format";
import { usePlatformCounts, useAllLicenses, useBillingDashboardAggregates } from "@/features/billing-dashboard/hooks/use-billing-dashboard";

export default function BillingDashboardPage() {
  const platformCounts = usePlatformCounts();
  const licenses = useAllLicenses();
  const { aggregates, isLoading } = useBillingDashboardAggregates();

  const activeLicenses = licenses.data?.items.filter((l) => l.status === "ACTIVE").length ?? 0;
  const expiringSoon =
    licenses.data?.items.filter((l) => {
      if (!l.expiresAt || l.status !== "ACTIVE") return false;
      const days = (new Date(l.expiresAt).getTime() - Date.now()) / 86_400_000;
      return days >= 0 && days <= 30;
    }).length ?? 0;

  return (
    <div>
      <PageHeader title="Billing Dashboard" description="Revenue, subscriptions, licenses, and payment health." />
      <ScopeBanner />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue (accessible orgs)" value={isLoading ? "…" : formatCents(aggregates.totalRevenueCents)} icon={DollarSign} />
        <StatCard label="Active Subscriptions (platform-wide)" value={platformCounts.isLoading ? "…" : String(platformCounts.data?.platformStats.activeSubscriptions ?? 0)} icon={Users} />
        <StatCard label="Trial Accounts (accessible orgs)" value={isLoading ? "…" : String(aggregates.trialAccounts)} icon={Timer} />
        <StatCard label="MRR (accessible orgs)" value={isLoading ? "…" : formatCents(aggregates.mrrCents)} icon={TrendingUp} />
        <StatCard label="ARR (accessible orgs)" value={isLoading ? "…" : formatCents(aggregates.arrCents)} icon={Landmark} />
        <StatCard
          label="Failed Payments (accessible orgs)"
          value={isLoading ? "…" : String(aggregates.failedPayments)}
          icon={AlertTriangle}
          trend={aggregates.paymentSuccessRate !== null ? `${formatPercent(aggregates.paymentSuccessRate)} success rate` : undefined}
        />
        <StatCard label="Active Licenses (platform-wide)" value={licenses.isLoading ? "…" : String(activeLicenses)} icon={KeyRound} />
        <StatCard label="Expiring Licenses (30d, platform-wide)" value={licenses.isLoading ? "…" : String(expiringSoon)} icon={CalendarClock} />
      </div>

      <div className="mt-6 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Revenue trend, subscription growth, license distribution, and payment success rate charts require historical
        time-series aggregation that no existing endpoint provides (invoices/payments are only queryable as flat,
        per-organization lists — see the implementation summary for detail). The stat cards above use the real,
        currently available data instead of a placeholder chart.
      </div>
    </div>
  );
}
