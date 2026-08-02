import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { MonitoringDashboard, SynchronizationHealth } from "@/features/market-data-shared/types";

/** The single "Enterprise Dashboard" aggregation this backend exposes —
 * reused by both `/market-data/dashboard` and `/market-data/monitoring`,
 * which the prompt lists as two different pages, rather than fetched
 * twice or duplicated into two hooks. See `MonitoringDashboardService`'s
 * own doc comment for exactly which raw metrics (queue depth, retries,
 * etc.) are and are not represented in this shape. */
export function useMonitoringDashboard() {
  return useQuery({
    queryKey: ["market-data", "monitoring", "dashboard"],
    queryFn: () => api.get<MonitoringDashboard>("/market-data/monitoring/dashboard"),
    refetchInterval: 30_000,
  });
}

/** A coarse, all-time-count-based signal, distinct from the dashboard
 * above — see `SynchronizationController`'s own doc comment. Used for
 * the Monitoring page's "System Status" card (ok/degraded + database
 * connectivity), which the dashboard endpoint doesn't carry. */
export function useSynchronizationHealth() {
  return useQuery({
    queryKey: ["market-data", "synchronizations", "health"],
    queryFn: () => api.get<SynchronizationHealth>("/market-data/synchronizations/health"),
    refetchInterval: 30_000,
  });
}

/** In-memory counters for this running API instance only — not a
 * persisted metric, see `MarketDataMetricsService`'s own scope note
 * (surfaced verbatim in the endpoint's own summary). */
export function useSynchronizationMetrics() {
  return useQuery({
    queryKey: ["market-data", "synchronizations", "metrics"],
    queryFn: () => api.get<Record<string, number>>("/market-data/synchronizations/metrics"),
  });
}
