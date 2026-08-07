import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@rmsm/ui";
import { cn } from "@rmsm/ui";

export function StatCard({
  title,
  icon,
  value,
  subtext,
  isLoading,
  isError,
  valueClassName,
}: {
  title: string;
  icon?: ReactNode;
  value: ReactNode;
  subtext?: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : isError ? (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            Unavailable
          </div>
        ) : (
          <>
            <div className={cn("text-2xl font-semibold tabular-nums", valueClassName)}>{value}</div>
            {subtext && <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function WidgetCard({
  title,
  icon,
  children,
  action,
  isLoading,
  isError,
  errorMessage,
  className,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  /** UD-001.1 Phase 3 addition — when provided, `WidgetCard` renders the
   * loading/error state itself (mirroring `StatCard`'s existing pattern)
   * instead of every widget re-implementing its own skeleton/error
   * markup. Optional: omitting both (the default) renders `children`
   * unconditionally, exactly as before this change. */
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: ReactNode;
  /** UD-001.1 Phase 3 — grid-span utility classes, same purpose as
   * `StatCard`'s new `className`. */
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : isError ? (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            {errorMessage ?? "Unavailable"}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
