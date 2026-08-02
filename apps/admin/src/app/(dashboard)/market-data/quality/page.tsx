"use client";

import { Gauge, ShieldCheck, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SimpleBarChart } from "@/features/market-data-shared/components/simple-bar-chart";
import { useQualitySummary } from "@/features/market-data-quality/hooks/use-quality";

function formatScore(score: number | null | undefined): string {
  return score == null ? "—" : `${(score * 100).toFixed(1)}%`;
}

export default function DataQualityPage() {
  const summary = useQualitySummary();
  const issuesByStatus = summary.data?.issuesByStatus ?? {};
  const chartData = Object.entries(issuesByStatus).map(([label, value]) => ({ label: label.replace(/_/g, " "), value }));
  const totalIssues = Object.values(issuesByStatus).reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Data Quality" description="Candle-level quality and confidence scoring, aggregated across all instruments." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Avg. Quality Score" value={summary.isLoading ? "…" : formatScore(summary.data?.averageScores.avgQualityScore)} icon={Gauge} />
        <StatCard label="Avg. Confidence Score" value={summary.isLoading ? "…" : formatScore(summary.data?.averageScores.avgConfidenceScore)} icon={ShieldCheck} />
        <StatCard label="Total Quality Issues" value={summary.isLoading ? "…" : String(totalIssues)} icon={AlertTriangle} />
      </div>

      <SimpleBarChart title="Quality Issues by Status" data={chartData} emptyMessage="No quality issues recorded." />

      <Alert>
        <AlertDescription>
          The Quality API reports issue counts grouped by status (open, under review, corrected, ignored), not by issue type. A
          breakdown of missing bars, duplicate bars, price outliers, bad OHLC, and volume errors individually is not exposed by any
          existing endpoint, so it isn&apos;t shown here rather than being estimated or faked.
        </AlertDescription>
      </Alert>
    </div>
  );
}
