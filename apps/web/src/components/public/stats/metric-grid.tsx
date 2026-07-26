import { cn } from "@/lib/utils";
import { StatCard, type StatCardProps } from "./stat-card";

interface MetricGridProps {
  metrics: StatCardProps[];
  columns?: 2 | 3 | 4;
  className?: string;
}

const COLUMN_CLASSES = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" } as const;

export function MetricGrid({ metrics, columns = 4, className }: MetricGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-4", COLUMN_CLASSES[columns], className)}>
      {metrics.map((metric) => (
        <StatCard key={metric.label} {...metric} />
      ))}
    </div>
  );
}
