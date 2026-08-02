"use client";

import { useMemo, useState } from "react";
import { Download, Activity, Users, Database, Building2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ScopeBanner } from "@/features/billing-shared/components/scope-banner";
import { exportToCsv } from "@/features/billing-shared/csv-export";
import { Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@rmsm/ui";
import {
  useCurrentUsageFanout,
  useUsageHistoryFanout,
  useAvailableMetrics,
  aggregateHistoryByPeriod,
} from "@/features/billing-usage/hooks/use-usage-analytics";
import { UsageTrendChart } from "@/features/billing-usage/components/usage-trend-chart";

function sumMetric(rows: ReturnType<typeof useCurrentUsageFanout>["rows"], metric: string): number {
  let total = 0;
  for (const r of rows) {
    if (!r.data) continue;
    for (const record of r.data) if (record.metric === metric) total += Number(record.value);
  }
  return total;
}

export default function UsageAnalyticsPage() {
  const { rows, organizationsQuery } = useCurrentUsageFanout();
  const metrics = useAvailableMetrics(rows);
  const [selectedMetric, setSelectedMetric] = useState<string | undefined>(undefined);
  const activeMetric = selectedMetric ?? metrics[0];
  const historyRows = useUsageHistoryFanout(activeMetric);
  const trendData = useMemo(() => aggregateHistoryByPeriod(historyRows), [historyRows]);

  const apiCallsTotal = sumMetric(rows, "api_calls");
  const seatsTotal = sumMetric(rows, "seats");
  const storageTotal = sumMetric(rows, "storage_bytes");

  function handleExport() {
    exportToCsv(
      `usage-${activeMetric ?? "all"}.csv`,
      trendData.map((d) => ({ period: d.period, metric: activeMetric, value: d.value })),
    );
  }

  return (
    <div>
      <PageHeader
        title="Usage Analytics"
        description="API usage, seats, and storage across accessible organizations."
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={trendData.length === 0}>
            <Download className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            Export
          </Button>
        }
      />
      <ScopeBanner />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="API Usage (api_calls)" value={organizationsQuery.isLoading ? "…" : apiCallsTotal.toLocaleString()} icon={Activity} />
        <StatCard label="Seat Usage (seats)" value={organizationsQuery.isLoading ? "…" : seatsTotal.toLocaleString()} icon={Users} />
        <StatCard label="Storage (storage_bytes)" value={organizationsQuery.isLoading ? "…" : storageTotal.toLocaleString()} icon={Database} />
        <StatCard label="Organizations" value={organizationsQuery.isLoading ? "…" : String(organizationsQuery.data?.items.length ?? 0)} icon={Building2} />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <p className="text-sm font-medium">Monthly Growth — Metric:</p>
        <Select value={activeMetric} onValueChange={setSelectedMetric}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder={metrics.length === 0 ? "No metrics recorded yet" : "Select metric"} />
          </SelectTrigger>
          <SelectContent>
            {metrics.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4">
        <UsageTrendChart title={activeMetric ? `${activeMetric} — last 12 months` : "Monthly Growth"} data={trendData} />
      </div>
    </div>
  );
}
