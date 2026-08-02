"use client";

import { useMemo } from "react";
import { useAccessibleOrganizations } from "@/features/billing-shared/hooks/use-accessible-organizations";
import { useOrgFanout } from "@/features/billing-shared/hooks/use-org-fanout";
import type { UsageRecord } from "@/features/billing-shared/types";

export function useCurrentUsageFanout() {
  const organizations = useAccessibleOrganizations();
  const rows = useOrgFanout<UsageRecord[]>(organizations.data?.items, (id) => `/billing/organizations/${id}/usage`, "billing-usage-current");
  return { rows, organizationsQuery: organizations };
}

/** One org's history for one metric — used per-org inside the metric
 * trend chart, aggregated client-side across accessible organizations
 * (no cross-org usage aggregation endpoint exists). */
export function useUsageHistoryFanout(metric: string | undefined, monthsAgo = 12) {
  const organizations = useAccessibleOrganizations();
  const rows = useOrgFanout<UsageRecord[]>(
    metric ? organizations.data?.items : undefined,
    (id) => `/billing/organizations/${id}/usage/history?metric=${encodeURIComponent(metric ?? "")}&monthsAgo=${monthsAgo}`,
    `billing-usage-history-${metric}`,
  );
  return rows;
}

export function useAvailableMetrics(currentUsageRows: ReturnType<typeof useCurrentUsageFanout>["rows"]): string[] {
  return useMemo(() => {
    const metrics = new Set<string>();
    for (const r of currentUsageRows) {
      if (!r.data) continue;
      for (const record of r.data) metrics.add(record.metric);
    }
    return Array.from(metrics).sort();
  }, [currentUsageRows]);
}

export function aggregateHistoryByPeriod(rows: { data: UsageRecord[] | undefined }[]): { period: string; value: number }[] {
  const byPeriod = new Map<string, number>();
  for (const r of rows) {
    if (!r.data) continue;
    for (const record of r.data) {
      const key = record.period.slice(0, 10);
      byPeriod.set(key, (byPeriod.get(key) ?? 0) + Number(record.value));
    }
  }
  return Array.from(byPeriod.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value]) => ({ period, value }));
}
