import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/public/content";
import { MetricGrid } from "./metric-grid";
import type { StatCardProps } from "./stat-card";

interface StatisticsSectionProps {
  title?: string;
  description?: string;
  metrics: StatCardProps[];
  columns?: 2 | 3 | 4;
  className?: string;
}

/** Composed section wrapper: optional heading + `MetricGrid`. Pages that
 * just want the grid without a heading can render `MetricGrid` directly. */
export function StatisticsSection({ title, description, metrics, columns, className }: StatisticsSectionProps) {
  return (
    <div className={cn("flex flex-col gap-10", className)}>
      {title ? <SectionHeader title={title} description={description} /> : null}
      <MetricGrid metrics={metrics} columns={columns} />
    </div>
  );
}
