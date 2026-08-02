"use client";

import { Activity, Database, HardDrive, AlertOctagon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Alert, AlertDescription, Skeleton } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { SimpleBarChart } from "@/features/market-data-shared/components/simple-bar-chart";
import { useMonitoringDashboard, useSynchronizationHealth, useSynchronizationMetrics } from "@/features/market-data-monitoring/hooks/use-monitoring";

function toChartData(record: Record<string, number> | undefined): { label: string; value: number }[] {
  return Object.entries(record ?? {}).map(([label, value]) => ({ label: label.replace(/_/g, " "), value }));
}

export default function MonitoringPage() {
  const dashboard = useMonitoringDashboard();
  const health = useSynchronizationHealth();
  const metrics = useSynchronizationMetrics();

  return (
    <div className="space-y-6">
      <PageHeader title="Monitoring" description="System-wide health, throughput, and storage for the Market Data platform." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="System Status"
          value={health.isLoading ? "…" : (health.data?.status ?? "unknown")}
          icon={Activity}
          trendDirection={health.data?.status === "ok" ? "up" : "down"}
        />
        <StatCard label="Database" value={health.isLoading ? "…" : (health.data?.database ?? "unknown")} icon={Database} trendDirection={health.data?.database === "ok" ? "up" : "down"} />
        <StatCard label="Total Failed Imports" value={health.isLoading ? "…" : String(health.data?.totalFailedImportCount ?? 0)} icon={AlertOctagon} trendDirection={health.data && health.data.totalFailedImportCount > 0 ? "down" : "neutral"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SimpleBarChart title="Import Jobs by Status" data={toChartData(dashboard.data?.importJobsByStatus)} emptyMessage="No import jobs yet." />
        <SimpleBarChart title="Gaps by Status" data={toChartData(dashboard.data?.gapsByStatus)} emptyMessage="No gaps recorded." />
        <SimpleBarChart title="Quality Issues by Status" data={toChartData(dashboard.data?.qualityIssuesByStatus)} emptyMessage="No quality issues recorded." />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provider Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.isLoading && <Skeleton className="h-24 w-full" />}
            {dashboard.data?.providerHealth.length === 0 && <p className="text-sm text-muted-foreground">No providers configured.</p>}
            {dashboard.data?.providerHealth.map((p) => (
              <div key={p.providerConfigId} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                <span>{p.name}</span>
                <StatusBadge status={p.registered && p.enabled && p.circuitState === "closed" ? "ACTIVE" : p.circuitState === "open" ? "REJECTED" : "PENDING"} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4" aria-hidden="true" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dashboard.isLoading && <Skeleton className="h-16 w-full" />}
          {dashboard.data?.storageUsage.map((s) => (
            <div key={s.tableName} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
              <span className="font-mono text-xs">{s.tableName}</span>
              <span>{s.totalSizePretty}</span>
            </div>
          ))}
          {dashboard.data && (
            <div className="flex items-center justify-between pt-2 text-sm font-medium">
              <span>Total</span>
              <span>{(dashboard.data.totalStorageBytes / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          )}
        </CardContent>
      </Card>

      {metrics.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live Instance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {Object.entries(metrics.data).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-muted-foreground">{key.replace(/_/g, " ")}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      <Alert>
        <AlertDescription>
          These in-memory counters reset when the API instance restarts and are not a persisted metrics store. There is no dedicated
          queue/scheduler/worker inspection endpoint or a system alerts/log feed in this API, so those sections aren&apos;t shown here
          rather than being fabricated.
        </AlertDescription>
      </Alert>
    </div>
  );
}
