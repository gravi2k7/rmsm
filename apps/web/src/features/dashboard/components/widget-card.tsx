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
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : isError ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <span>Unavailable</span>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "text-2xl font-semibold tabular-nums",
                valueClassName,
              )}
            >
              {value}
            </div>

            {subtext && (
              <div className="mt-1 text-xs text-muted-foreground">
                {subtext}
              </div>
            )}
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
  isLoading = false,
  isError = false,
  errorMessage = "Unable to load this widget.",
  className,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  className?: string;
}) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </CardTitle>

        {action}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div
            className="space-y-3"
            aria-busy="true"
            aria-label={`Loading ${title}`}
          >
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="flex items-center gap-2 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}