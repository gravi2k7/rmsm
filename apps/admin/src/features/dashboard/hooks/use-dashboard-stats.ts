import { useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface Paginated<T> {
  items: T[];
  total: number;
}

interface OrganizationSummary {
  id: string;
  status: string;
}

interface StrategySummary {
  id: string;
  status: string;
  enabled: boolean;
}

interface OpportunitySummary {
  id: string;
  status: string;
}

interface ExecutionSummary {
  id: string;
  startedAt: string;
  status: string;
}

interface PositionSummary {
  id: string;
  status: string;
}

interface PortfolioSummary {
  cashBalance: number;
  equity: number;
}

interface TradeSummary {
  id: string;
  realizedPnl: number;
  closedAt: string;
}

interface HealthSummary {
  status: string;
}

interface ReadinessSummary {
  status: string;
  checks: Record<string, "ok" | "error">;
}

/** The 6 newer domains (strategies/opportunities/executions/positions/
 * trades) use this app-layer's own `PaginationQueryDto`, capped at 500.
 * `organizations` is an older, Module-003 endpoint with its own
 * `PaginationDto` capped at 100 — two genuinely different, independently
 * evolved pagination limits, not a typo. */
const APPLICATION_LAYER_MAX_PAGE_SIZE = 500;
const ORGANIZATIONS_MAX_PAGE_SIZE = 100;

function isToday(isoDate: string): boolean {
  const date = new Date(isoDate);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

export function useDashboardStats() {
  const results = useQueries({
    queries: [
      // Scoped to organizations the admin's own account belongs to —
      // OrganizationController's own list endpoint is deliberately
      // membership-scoped, not platform-wide (see its own doc comment),
      // to avoid a cross-tenant data leak. Not something this dashboard
      // can or should work around.
      { queryKey: ["dashboard", "organizations"], queryFn: () => api.get<Paginated<OrganizationSummary>>(`/organizations?page=1&pageSize=${ORGANIZATIONS_MAX_PAGE_SIZE}`) },
      { queryKey: ["dashboard", "strategies"], queryFn: () => api.get<Paginated<StrategySummary>>(`/strategies?pageSize=${APPLICATION_LAYER_MAX_PAGE_SIZE}`) },
      { queryKey: ["dashboard", "opportunities"], queryFn: () => api.get<Paginated<OpportunitySummary>>(`/opportunities?pageSize=${APPLICATION_LAYER_MAX_PAGE_SIZE}`) },
      { queryKey: ["dashboard", "executions"], queryFn: () => api.get<Paginated<ExecutionSummary>>(`/executions?pageSize=${APPLICATION_LAYER_MAX_PAGE_SIZE}`) },
      { queryKey: ["dashboard", "positions"], queryFn: () => api.get<Paginated<PositionSummary>>(`/positions?pageSize=${APPLICATION_LAYER_MAX_PAGE_SIZE}`) },
      { queryKey: ["dashboard", "portfolio"], queryFn: () => api.get<PortfolioSummary>("/portfolio") },
      { queryKey: ["dashboard", "trades"], queryFn: () => api.get<Paginated<TradeSummary>>(`/trades?pageSize=${APPLICATION_LAYER_MAX_PAGE_SIZE}`) },
      { queryKey: ["dashboard", "health"], queryFn: () => api.get<HealthSummary>("/health", { skipAuth: true }) },
      { queryKey: ["dashboard", "readiness"], queryFn: () => api.get<ReadinessSummary>("/health/ready", { skipAuth: true }) },
    ],
  });

  const [organizations, strategies, opportunities, executions, positions, portfolio, trades, health, readiness] = results;

  const isLoading = results.some((r) => r.isLoading);
  const firstError = results.find((r) => r.isError)?.error;

  const todaysExecutions = executions.data?.items.filter((e) => isToday(e.startedAt)).length;
  const openPositions = positions.data?.items.filter((p) => p.status === "OPEN").length;
  const pendingOpportunities = opportunities.data?.items.filter((o) => o.status === "PENDING").length;
  const activeStrategies = strategies.data?.items.filter((s) => s.enabled).length;
  const todaysRealizedPnl = trades.data?.items.filter((t) => isToday(t.closedAt)).reduce((sum, t) => sum + t.realizedPnl, 0);

  return {
    isLoading,
    error: firstError,
    totalOrganizations: organizations.data?.total,
    activeStrategies,
    totalStrategies: strategies.data?.total,
    pendingOpportunities,
    totalOpportunities: opportunities.data?.total,
    todaysExecutions,
    openPositions,
    portfolioEquity: portfolio.data?.equity,
    todaysRealizedPnl,
    apiHealthy: health.data?.status === "ok",
    systemHealthy: readiness.data?.status === "ok",
    refetchAll: () => results.forEach((r) => r.refetch()),
  };
}
