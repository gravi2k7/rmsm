import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconWrapper } from "@/components/public/icons";
import { Counter } from "./counter";

export interface StatCardProps {
  icon?: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  /** Presentational only — e.g. "+12% YoY". No computation happens here;
   * the caller supplies the finished trend string. */
  trend?: string;
  className?: string;
}

export function StatCard({ icon, label, value, suffix, prefix, trend, className }: StatCardProps) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-border p-6", className)}>
      {icon ? <IconWrapper icon={icon} variant="muted" /> : null}
      <div>
        <p className="text-3xl font-semibold tracking-tight">
          <Counter value={value} suffix={suffix} prefix={prefix} />
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </div>
      {trend ? <p className="text-xs font-medium text-primary">{trend}</p> : null}
    </div>
  );
}
