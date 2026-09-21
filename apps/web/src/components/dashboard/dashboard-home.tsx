"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  LineChart as LineChartIcon,
  ListOrdered,
  Activity,
  Target,
  ShieldAlert,
  DollarSign,
  Percent,
  Landmark,
  RefreshCw,
  Search,
  BookMarked,
} from "lucide-react";
import { Button, Alert, AlertDescription } from "@rmsm/ui";
import { useOpportunities } from "@/features/opportunities/hooks/use-opportunities";
import { useDecisions } from "@/features/decisions/hooks/use-decisions";
import { useStrategySummaries } from "@/features/strategy-summary/hooks/use-strategy-summaries";
import { useTradingAccounts, useTradingAccount, useTradingOrders, useTradingPositions, useTradingTrades } from "@/features/trading/hooks/use-trading-accounts";
import { useTradingAccountUnrealizedPnl } from "@/features/dashboard/hooks/use-trading-account-unrealized-pnl";
import { StatCard } from "@/features/dashboard/components/widget-card";
import { useAuthStore } from "@/lib/auth-store";
import { useUserAccount } from "@/features/profile/hooks/use-profile";
import { useOrganizationStore } from "@/lib/organization-store";
import { WidgetGrid } from "@/components/dashboard/widgets";
import { DashboardWidgetZone } from "@/components/dashboard/widget-zone";

const OPEN_ORDER_STATUSES = new Set(["PENDING", "SUBMITTED", "ACCEPTED", "PARTIALLY_FILLED"]);

function currency(value: number | undefined): string {
  if (value === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function isToday(isoDate: string): boolean {
  const date = new Date(isoDate);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

/**
 * UD-001.1 Phase 3/4 — Enterprise Dashboard Home layout.
 *
 * A direct extraction of what `app/(app)/dashboard/page.tsx` used to
 * render inline (same extraction pattern Phase 1 used for
 * `DashboardShell`) — every existing stat, data source, and the header's
 * existing shortcut buttons are unchanged.
 *
 * The four KPI rows (Portfolio at a glance, Operational counts, Risk/
 * Cash) are page-level `StatCard`s: each needs several combined queries'
 * derived values computed here (`dailyPnl`, `unrealized`, `performance`,
 * ...), so they stay owned by this page rather than becoming pluggable
 * registry widgets — they aren't really "widgets" in the extensible
 * sense, they're this page's own KPIs.
 *
 * The widget row below them (Market Status, Trading Sessions, System
 * Status, Quick Actions, Recent Activity) is fully pluggable: this page
 * only renders `<DashboardWidgetZone zone="home" />` (Phase 4's layout
 * engine) and has no idea what's actually in it. Every future module's
 * Dashboard Home widget joins that same zone via `components/dashboard/
 * widgets/manifest.ts` — this component does not change when that
 * happens.
 */
export function DashboardHome({
  excludeWidgetIds = [],
}: {
  excludeWidgetIds?: string[];
}) {
  const user = useAuthStore((s) => s.user);
  const accountQuery = useUserAccount();
  const activeOrganization = useOrganizationStore((s) => s.activeOrganization);
  const queryClient = useQueryClient();

  const organizationId = activeOrganization?.id;
  const tradingAccountsQuery = useTradingAccounts(organizationId);

  const demoAccount =
    tradingAccountsQuery.data?.find(
      (account) => account.type === "DEMO" && account.status === "ACTIVE",
    ) ?? tradingAccountsQuery.data?.find((account) => account.type === "DEMO");

  const accountId = demoAccount?.id;

  const tradingAccountQuery = useTradingAccount(
    organizationId,
    accountId,
  );
  const positionsQuery = useTradingPositions(
    organizationId,
    accountId,
  );
  const ordersQuery = useTradingOrders(
    organizationId,
    accountId,
  );
  const tradesQuery = useTradingTrades(
    organizationId,
    accountId,
  );

  const firstName = accountQuery.data?.profile?.firstName?.trim() ?? "";
  const lastName = accountQuery.data?.profile?.lastName?.trim() ?? "";
  const displayName = [firstName, lastName].filter(Boolean).join(" ");

  const opportunitiesQuery = useOpportunities();
  const decisionsQuery = useDecisions();
  const strategiesQuery = useStrategySummaries();
  const unrealized = useTradingAccountUnrealizedPnl(positionsQuery.data);

  const openPositions = positionsQuery.data?.filter((p) => p.status === "OPEN") ?? [];
  const openOrders = ordersQuery.data?.filter((o) => OPEN_ORDER_STATUSES.has(o.status)) ?? [];
  const todaysTrades = tradesQuery.data?.filter((t) => isToday(t.closedAt)) ?? [];
  const todaysOpportunities = opportunitiesQuery.data?.items.filter((o) => isToday(o.createdAt)) ?? [];
  const activeStrategies = strategiesQuery.data?.items.filter((s) => s.enabled) ?? [];
  const realizedPnl =
    tradesQuery.data?.reduce(
      (sum, trade) => sum + Number(trade.realizedPnl),
      0,
    ) ?? 0;

  const dailyPnl =
    todaysTrades.length > 0
      ? todaysTrades.reduce(
          (sum, trade) => sum + Number(trade.realizedPnl),
          0,
        )
      : 0;

  const winningTrades =
    tradesQuery.data?.filter((trade) => Number(trade.realizedPnl) > 0)
      .length ?? 0;

  const totalTrades = tradesQuery.data?.length ?? 0;

  const winRate =
    totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const recentDecisions = decisionsQuery.data?.items.slice(0, 20) ?? [];
  const avgRiskScore = recentDecisions.length > 0 ? recentDecisions.reduce((sum, d) => sum + d.riskScore, 0) / recentDecisions.length : undefined;

  function handleRefresh() {
    queryClient.invalidateQueries();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            Welcome{displayName ? `, ${displayName}` : user?.email ? `, ${user.email}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">Your trading workspace at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/market">
              <Search className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Market Watch
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/strategies">
              <LineChartIcon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Strategy Center
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/watchlists">
              <BookMarked className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Watchlists
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Portfolio at a glance */}
      <WidgetGrid>
        <StatCard
          title="Portfolio Value"
          icon={<Wallet className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          value={currency(tradingAccountQuery.data ? Number(tradingAccountQuery.data.balance) : undefined)}
          isLoading={tradingAccountQuery.isLoading || tradingAccountsQuery.isLoading}
          isError={tradingAccountQuery.isError || tradingAccountsQuery.isError}
        />
        <StatCard
          title="Daily P&L"
          icon={
            dailyPnl !== undefined && dailyPnl >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success" aria-hidden="true" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" aria-hidden="true" />
            )
          }
          value={currency(dailyPnl)}
          valueClassName={dailyPnl !== undefined ? (dailyPnl >= 0 ? "text-success" : "text-destructive") : undefined}
          subtext={`${todaysTrades.length} trade${todaysTrades.length === 1 ? "" : "s"} closed today`}
          isLoading={tradesQuery.isLoading}
          isError={tradesQuery.isError}
        />
        <StatCard
          title="Unrealized P&L"
          icon={<Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          value={currency(unrealized.total)}
          valueClassName={unrealized.total >= 0 ? "text-success" : "text-destructive"}
          subtext={
            unrealized.unresolvedCount > 0
              ? `${unrealized.resolvedCount} of ${unrealized.resolvedCount + unrealized.unresolvedCount} open positions priced`
              : openPositions.length > 0
                ? "all open positions priced"
                : "no open positions"
          }
          isLoading={positionsQuery.isLoading || unrealized.isLoading}
          isError={positionsQuery.isError}
        />
        <StatCard
          title="Realized P&L (all time)"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          value={currency(tradesQuery.data ? realizedPnl : undefined)}
          valueClassName={tradesQuery.data ? (realizedPnl >= 0 ? "text-success" : "text-destructive") : undefined}
          subtext={tradesQuery.data ? `${winRate.toFixed(0)}% win rate over ${totalTrades} trades` : undefined}
          isLoading={tradesQuery.isLoading}
          isError={tradesQuery.isError}
        />
      </WidgetGrid>

      <WidgetGrid>
        <StatCard
          title="Open Positions"
          icon={<ListOrdered className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          value={openPositions.length}
          isLoading={positionsQuery.isLoading}
          isError={positionsQuery.isError}
        />
        <StatCard
          title="Open Orders"
          icon={<ListOrdered className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          value={openOrders.length}
          isLoading={ordersQuery.isLoading}
          isError={ordersQuery.isError}
        />
        <StatCard
          title="Active Strategies"
          icon={<LineChartIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          value={activeStrategies.length}
          subtext={strategiesQuery.data ? `of ${strategiesQuery.data.total} total` : undefined}
          isLoading={strategiesQuery.isLoading}
          isError={strategiesQuery.isError}
        />
        <StatCard
          title="Today's Opportunities"
          icon={<Target className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          value={todaysOpportunities.length}
          isLoading={opportunitiesQuery.isLoading}
          isError={opportunitiesQuery.isError}
        />
      </WidgetGrid>

      <WidgetGrid>
        <StatCard
          title="Risk Score"
          icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          value={avgRiskScore !== undefined ? avgRiskScore.toFixed(1) : "—"}
          subtext={recentDecisions.length > 0 ? `avg. over ${recentDecisions.length} recent decisions` : "no recent decisions"}
          isLoading={decisionsQuery.isLoading}
          isError={decisionsQuery.isError}
        />
        <StatCard
          title="Buying Power"
          icon={<Landmark className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          value="—"
          isLoading={tradingAccountQuery.isLoading || tradingAccountsQuery.isLoading}
          isError={tradingAccountQuery.isError || tradingAccountsQuery.isError}
        />
        <StatCard
          title="Margin Used"
          icon={<Percent className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          value="—"
          subtext="Not provided by trading account API"
          isLoading={tradingAccountQuery.isLoading || tradingAccountsQuery.isLoading}
          isError={tradingAccountQuery.isError || tradingAccountsQuery.isError}
        />
        <StatCard
          title="Available Cash"
          icon={<Wallet className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          value={currency(tradingAccountQuery.data ? Number(tradingAccountQuery.data.balance) : undefined)}
          isLoading={tradingAccountQuery.isLoading || tradingAccountsQuery.isLoading}
          isError={tradingAccountQuery.isError || tradingAccountsQuery.isError}
        />
      </WidgetGrid>

      {/* Phase 4 — every widget below (Market Status, Trading Sessions,
       * System Status, Quick Actions, Recent Activity, and anything a
       * future module registers) renders through the pluggable widget
       * registry; this page doesn't enumerate them. */}
      <DashboardWidgetZone
        zone="home"
        columns={3}
        excludeWidgetIds={excludeWidgetIds}
      />

      {(tradingAccountQuery.isError || positionsQuery.isError || tradesQuery.isError) && (
        <Alert variant="destructive">
          <AlertDescription>Some portfolio data couldn&apos;t be loaded. Figures above may be incomplete.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
