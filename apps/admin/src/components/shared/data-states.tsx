import type { ReactNode } from "react";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Button, Skeleton } from "@rmsm/ui";
import { ApiError } from "@/lib/api-client";

export function LoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
      <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
      <div>
        <p className="font-medium">Couldn&apos;t load this data</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
