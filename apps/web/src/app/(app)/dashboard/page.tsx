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
  HeartPulse,
  Bell,
  Search,
  BookMarked,
} from "lucide-react";
import { Button, Alert, AlertDescription, Skeleton, Badge, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@rmsm/ui";
import { usePortfolio, usePositions, useTrades } from "@/features/portfolio/hooks/use-portfolio";
import { computePerformanceMetrics, computeTodaysRealizedPnl } from "@/features/portfolio/lib/performance";
import { useOrders } from "@/features/execution/hooks/use-execution";
import { useOpportunities } from "@/features/opportunities/hooks/use-opportunities";
import { useDecisions } from "@/features/decisions/hooks/use-decisions";
import { useStrategySummaries } from "@/features/strategy-summary/hooks/use-strategy-summaries";
import { useApiHealth } from "@/features/dashboard/hooks/use-health";
import { useUnrealizedPnl } from "@/features/dashboard/hooks/use-unrealized-pnl";
import { StatCard, WidgetCard } from "@/features/dashboard/components/widget-card";
import { MarketStatusWidget } from "@/features/market/components/market-status-widget";
import { TradingSessionsWidget } from "@/features/market/components/trading-sessions-widget";
import { useAuthStore } from "@/lib/auth-store";

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

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const portfolioQuery = usePortfolio();
  const positionsQuery = usePositions();
  const tradesQuery = useTrades();
  const ordersQuery = useOrders();
  const opportunitiesQuery = useOpportunities();
  const decisionsQuery = useDecisions();
  const strategiesQuery = useStrategySummaries();
  const health = useApiHealth();
  const unrealized = useUnrealizedPnl(positionsQuery.data?.items);

  const openPositions = positionsQuery.data?.items.filter((p) => p.status === "OPEN") ?? [];
  const openOrders = ordersQuery.data?.items.filter((o) => OPEN_ORDER_STATUSES.has(o.status)) ?? [];
  const todaysTrades = tradesQuery.data?.items.filter((t) => isToday(t.closedAt)) ?? [];
  const todaysOpportunities = opportunitiesQuery.data?.items.filter((o) => isToday(o.createdAt)) ?? [];
  const activeStrategies = strategiesQuery.data?.items.filter((s) => s.enabled) ?? [];
  const performance = tradesQuery.data ? computePerformanceMetrics(tradesQuery.data.items) : null;
  const dailyPnl = tradesQuery.data ? computeTodaysRealizedPnl(tradesQuery.data.items) : undefined;

  const recentDecisions = decisionsQuery.data?.items.slice(0, 20) ?? [];
  const avgRiskScore = recentDecisions.length > 0 ? recentDecisions.reduce((sum, d) => sum + d.riskScore, 0) / recentDecisions.length : undefined;

  function handleRefresh() {
    queryClient.invalidateQueries();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Welcome{user?.email ? `, ${user.email}` : ""}</h1>
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Portfolio Value"
          icon={<Wallet className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          value={currency(portfolioQuery.data?.equity)}
          isLoading={portfolioQuery.isLoading}
          isError={portfolioQuery.isError}
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
          value={currency(performance?.realizedPnl)}
          valueClassName={performance && performance.realizedPnl >= 0 ? "text-success" : "text-destructive"}
          subtext={performance ? `${performance.winRate.toFixed(0)}% win rate over ${performance.totalTrades} trades` : undefined}
          isLoading={tradesQuery.isLoading}
          isError={tradesQuery.isError}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          value={currency(portfolioQuery.data?.buyingPower)}
          isLoading={portfolioQuery.isLoading}
          isError={portfolioQuery.isError}
        />
        <StatCard
          title="Margin Used"
          icon={<Percent className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          value={currency(portfolioQuery.data?.marginUsed)}
          subtext={portfolioQuery.data ? `${currency(portfolioQuery.data.marginAvailable)} available` : undefined}
          isLoading={portfolioQuery.isLoading}
          isError={portfolioQuery.isError}
        />
        <StatCard
          title="Available Cash"
          icon={<Wallet className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          value={currency(portfolioQuery.data?.cashBalance)}
          isLoading={portfolioQuery.isLoading}
          isError={portfolioQuery.isError}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <WidgetCard title="Market Status" icon={<Landmark className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}>
          <MarketStatusWidget />
        </WidgetCard>
        <WidgetCard title="Trading Sessions" icon={<Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}>
          <TradingSessionsWidget />
        </WidgetCard>
        <WidgetCard title="System" icon={<HeartPulse className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}>
          {health.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>API Health</span>
                <Badge variant={health.apiHealthy ? "success" : "destructive"}>{health.apiHealthy ? "Healthy" : "Degraded"}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>System Ready</span>
                <Badge variant={health.systemReady ? "success" : "destructive"}>{health.systemReady ? "Ready" : "Not ready"}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                        Notifications
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Notifications — coming in a future milestone</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Badge variant="outline">Coming soon</Badge>
              </div>
            </div>
          )}
        </WidgetCard>
      </div>

      {(portfolioQuery.isError || positionsQuery.isError || tradesQuery.isError) && (
        <Alert variant="destructive">
          <AlertDescription>Some portfolio data couldn&apos;t be loaded. Figures above may be incomplete.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
