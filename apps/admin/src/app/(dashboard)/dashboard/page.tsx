"use client";

import { Building2, LineChart, Target, ArrowRightLeft, Wallet, DollarSign, TrendingUp, HeartPulse, Server } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ErrorState } from "@/components/shared/data-states";
import { useDashboardStats } from "@/features/dashboard/hooks/use-dashboard-stats";

function formatCurrency(value: number | undefined): string {
  if (value === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatCount(value: number | undefined): string {
  return value === undefined ? "—" : value.toLocaleString();
}

export default function DashboardPage() {
  const stats = useDashboardStats();

  if (stats.error && !stats.isLoading) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Platform overview" />
        <ErrorState error={stats.error} onRetry={stats.refetchAll} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" description="Platform overview" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Organizations" value={stats.isLoading ? "…" : formatCount(stats.totalOrganizations)} icon={Building2} />
        <StatCard
          label="Active Strategies"
          value={stats.isLoading ? "…" : `${formatCount(stats.activeStrategies)} / ${formatCount(stats.totalStrategies)}`}
          icon={LineChart}
        />
        <StatCard
          label="Open Opportunities"
          value={stats.isLoading ? "…" : `${formatCount(stats.pendingOpportunities)} / ${formatCount(stats.totalOpportunities)}`}
          icon={Target}
        />
        <StatCard label="Today's Executions" value={stats.isLoading ? "…" : formatCount(stats.todaysExecutions)} icon={ArrowRightLeft} />
        <StatCard label="Current Positions" value={stats.isLoading ? "…" : formatCount(stats.openPositions)} icon={Wallet} />
        <StatCard label="Portfolio Value" value={stats.isLoading ? "…" : formatCurrency(stats.portfolioEquity)} icon={DollarSign} />
        <StatCard
          label="Daily P&L"
          value={stats.isLoading ? "…" : formatCurrency(stats.todaysRealizedPnl)}
          icon={TrendingUp}
          trend={stats.todaysRealizedPnl !== undefined ? (stats.todaysRealizedPnl >= 0 ? "Profitable today" : "Down today") : undefined}
          trendDirection={stats.todaysRealizedPnl !== undefined ? (stats.todaysRealizedPnl >= 0 ? "up" : "down") : "neutral"}
        />
        <StatCard
          label="System Health"
          value={stats.isLoading ? "…" : stats.systemHealthy ? "Healthy" : "Degraded"}
          icon={HeartPulse}
          trend={stats.isLoading ? undefined : stats.systemHealthy ? "All checks passing" : "Some checks failing"}
          trendDirection={stats.isLoading ? "neutral" : stats.systemHealthy ? "up" : "down"}
        />
        <StatCard
          label="API Status"
          value={stats.isLoading ? "…" : stats.apiHealthy ? "Online" : "Offline"}
          icon={Server}
          trendDirection={stats.isLoading ? "neutral" : stats.apiHealthy ? "up" : "down"}
        />
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        &quot;Organizations&quot; reflects organizations your own admin account belongs to — the platform&apos;s organization API is deliberately
        membership-scoped to prevent cross-tenant data exposure, not a platform-wide count. A dedicated Total Users metric isn&apos;t shown here: the
        platform currently has no admin-facing endpoint to count users across all organizations (see the Users page for organization-scoped member
        management).
      </p>
    </div>
  );
}
