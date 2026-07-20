"use client";

import { useState } from "react";
import { toast } from "@rmsm/ui";
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Badge } from "@rmsm/ui";
import { RotateCcw } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { LoadingState, ErrorState } from "@/components/shared/data-states";
import { useNotificationMetrics, useEmailProviders, useSmsProviders, usePushProviders, useDeadLetterQueue, useRetryDeadLetter } from "@/features/notifications/hooks/use-notifications";
import type { DeadLetterJob, RedactedProvider } from "@/features/notifications/types";
import { ApiError } from "@/lib/api-client";

const providerColumns: ColumnDef<RedactedProvider, unknown>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "createdAt", header: "Registered", cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString() },
];

const deadLetterColumns: ColumnDef<DeadLetterJob, unknown>[] = [
  { accessorKey: "id", header: "Job ID" },
  { accessorKey: "attempts", header: "Attempts" },
  { accessorKey: "failureReason", header: "Failure Reason", cell: ({ row }) => row.original.failureReason ?? "—" },
  { accessorKey: "createdAt", header: "Failed At", cell: ({ row }) => new Date(row.original.createdAt).toLocaleString() },
];

export default function NotificationsPage() {
  const metrics = useNotificationMetrics();
  const emailProviders = useEmailProviders();
  const smsProviders = useSmsProviders();
  const pushProviders = usePushProviders();
  const [queueName, setQueueName] = useState("email");
  const deadLetter = useDeadLetterQueue(queueName);
  const retryDeadLetter = useRetryDeadLetter(queueName);

  async function handleRetry() {
    try {
      const result = await retryDeadLetter.mutateAsync();
      toast.success(`Requeued ${result.retried} job(s).`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to retry dead-letter queue.");
    }
  }

  return (
    <div>
      <PageHeader title="Notification Center" description="Delivery metrics, providers, and dead-letter queue management." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Delivery Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.isLoading ? (
            <LoadingState rows={2} />
          ) : metrics.error ? (
            <ErrorState error={metrics.error} onRetry={() => metrics.refetch()} />
          ) : metrics.data && Object.keys(metrics.data).length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Object.entries(metrics.data).map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs text-muted-foreground">{key}</p>
                  <p className="text-xl font-semibold">{value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No metrics recorded yet on this instance.</p>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={providerColumns} data={emailProviders.data} isLoading={emailProviders.isLoading} error={emailProviders.error} onRetry={() => emailProviders.refetch()} emptyTitle="None configured" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SMS Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={providerColumns} data={smsProviders.data} isLoading={smsProviders.isLoading} error={smsProviders.error} onRetry={() => smsProviders.refetch()} emptyTitle="None configured" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Push Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={providerColumns} data={pushProviders.data} isLoading={pushProviders.isLoading} error={pushProviders.error} onRetry={() => pushProviders.refetch()} emptyTitle="None configured" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Dead-Letter Queue</CardTitle>
          <div className="flex items-center gap-2">
            <Input value={queueName} onChange={(e) => setQueueName(e.target.value)} placeholder="Queue name" className="w-40" aria-label="Queue name" />
            <Button variant="outline" size="sm" onClick={handleRetry} disabled={retryDeadLetter.isPending || !deadLetter.data?.length}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Retry All
            </Button>
            {deadLetter.data && <Badge variant={deadLetter.data.length > 0 ? "destructive" : "success"}>{deadLetter.data.length}</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={deadLetterColumns}
            data={deadLetter.data}
            isLoading={deadLetter.isLoading}
            error={deadLetter.error}
            onRetry={() => deadLetter.refetch()}
            emptyTitle="No dead-lettered jobs"
            emptyDescription="Jobs that exhaust every retry attempt on this queue appear here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
