import type { LucideIcon } from "lucide-react";
import { Card, CardContent, cn } from "@rmsm/ui";

export interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** A signed delta (e.g. "+3 today" or "-1.2%") — omitted when there's
   * no meaningful comparison for that metric. */
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
}

export function StatCard({ label, value, icon: Icon, trend, trendDirection = "neutral" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-6">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          {trend && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                trendDirection === "up" && "text-success",
                trendDirection === "down" && "text-destructive",
                trendDirection === "neutral" && "text-muted-foreground",
              )}
            >
              {trend}
            </p>
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}
