"use client";

import Link from "next/link";
import { Radio, RadioTower, ListChecks, CheckCircle2, XCircle, Clock, Gauge, TriangleAlert, Database, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { SimpleBarChart } from "@/features/market-data-shared/components/simple-bar-chart";
import { isProviderOnline } from "@/features/market-data-shared/provider-status";
import { formatPercent } from "@/features/billing-shared/format";
import { useMonitoringDashboard } from "@/features/market-data-monitoring/hooks/use-monitoring";
import { useImportJobsToday, useTotalInstrumentCount } from "@/features/market-data-dashboard/hooks/use-dashboard";

export default function MarketDataDashboardPage() {
  const dashboard = useMonitoringDashboard();
  const jobsToday = useImportJobsToday();
  const instrumentCount = useTotalInstrumentCount();

  const providers = dashboard.data?.providerHealth ?? [];
  const onlineCount = providers.filter(isProviderOnline).length;
  const offlineCount = providers.length - onlineCount;
  const missingCandles = dashboard.data?.gapsByStatus?.DETECTED ?? 0;
  const qualityScorePct = dashboard.data?.averageQualityScores.avgQualityScore != null ? dashboard.data.averageQualityScores.avgQualityScore * 100 : null;

  return (
    <div>
      <PageHeader title="Market Data Dashboard" description="Providers, imports, data quality, and storage at a glance." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Providers Online" value={dashboard.isLoading ? "…" : String(onlineCount)} icon={Radio} />
        <StatCard label="Providers Offline" value={dashboard.isLoading ? "…" : String(offlineCount)} icon={RadioTower} />
        <StatCard label="Import Jobs Today" value={jobsToday.isLoading ? "…" : String(jobsToday.total)} icon={ListChecks} />
        <StatCard label="Successful Imports (Today)" value={jobsToday.isLoading ? "…" : String(jobsToday.successful)} icon={CheckCircle2} />
        <StatCard label="Failed Imports (Today)" value={jobsToday.isLoading ? "…" : String(jobsToday.failed)} icon={XCircle} />
        <StatCard label="Pending Jobs (Today)" value={jobsToday.isLoading ? "…" : String(jobsToday.pending)} icon={Clock} />
        <StatCard label="Data Quality Score" value={dashboard.isLoading ? "…" : formatPercent(qualityScorePct)} icon={Gauge} />
        <StatCard label="Missing Candles" value={dashboard.isLoading ? "…" : String(missingCandles)} icon={TriangleAlert} />
        <StatCard label="Total Instruments" value={instrumentCount.isLoading ? "…" : String(instrumentCount.data?.pagination.totalCount ?? 0)} icon={Database} />
        <StatCard
          label="AI Readiness"
          value="Per-instrument"
          icon={Sparkles}
          trend="No platform-wide coverage endpoint — view AI Readiness page"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SimpleBarChart
          title="Provider Availability"
          data={providers.map((p) => ({ label: p.name, value: isProviderOnline(p) ? 1 : 0 }))}
          emptyMessage="No providers configured yet."
        />
        <SimpleBarChart
          title="Import Timeline (Today, by hour)"
          data={jobsToday.timelineByHour.filter((h) => h.count > 0).map((h) => ({ label: h.hour, value: h.count }))}
          emptyMessage="No imports have run yet today."
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Quality Trend</p>
          <p className="mt-2">
            Only current averages are exposed by the API (average quality score{" "}
            {dashboard.data ? formatPercent(qualityScorePct) : "…"}, average confidence{" "}
            {dashboard.data ? formatPercent(dashboard.data.averageQualityScores.avgConfidenceScore != null ? dashboard.data.averageQualityScores.avgConfidenceScore * 100 : null) : "…"}
            ) — there is no historical trend endpoint, so no trend line is shown here rather than a fabricated one.
          </p>
        </div>
        <SimpleBarChart
          title="Storage Usage by Table"
          data={(dashboard.data?.storageUsage ?? []).map((s) => ({ label: s.tableName, value: s.totalBytes }))}
          emptyMessage="No storage data yet."
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3 text-sm font-medium">Recent Jobs</div>
          <ul className="divide-y">
            {jobsToday.recent.length === 0 && <li className="p-4 text-sm text-muted-foreground">No recent jobs.</li>}
            {jobsToday.recent.map((job) => (
              <li key={job.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="truncate">{job.jobType}</span>
                <StatusBadge status={job.status} />
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">System Alerts</p>
          <p className="mt-2">
            No alerting endpoint exists in the market-data module. See the{" "}
            <Link href="/market-data/monitoring" className="underline underline-offset-2">
              Monitoring
            </Link>{" "}
            page for live provider/queue/quality status instead of a fabricated alerts feed.
          </p>
        </div>
      </div>
    </div>
  );
}
