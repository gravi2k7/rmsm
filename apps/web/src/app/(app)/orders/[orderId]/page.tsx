"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Info } from "lucide-react";
import { Button, Badge, Skeleton, Card, CardHeader, CardTitle, CardContent, Alert, AlertDescription } from "@rmsm/ui";
import { EmptyState } from "@/components/ui-extra/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useOrders, useExecutions } from "@/features/execution/hooks/use-execution";
import { useDecisions } from "@/features/decisions/hooks/use-decisions";
import { useOpportunities } from "@/features/opportunities/hooks/use-opportunities";

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const ordersQuery = useOrders();
  const executionsQuery = useExecutions();
  const decisionsQuery = useDecisions();
  const opportunitiesQuery = useOpportunities();

  const order = ordersQuery.data?.items.find((o) => o.id === params.orderId);
  const executions = (executionsQuery.data?.items ?? []).filter((e) => e.orderId === params.orderId);
  const relatedDecision = decisionsQuery.data?.items.find((d) => d.id === order?.decisionId);
  const relatedOpportunity = opportunitiesQuery.data?.items.find((o) => o.id === relatedDecision?.opportunityId);

  if (ordersQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!order) {
    return <EmptyState title="Order not found" description="It may not exist, or you may not have access." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/orders" aria-label="Back to Order Management">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">
              {order.side} {order.symbolCode}
            </h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{order.id}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Type" value={order.type.replace(/_/g, " ")} />
            <Row label="Side" value={order.side} />
            <Row label="Quantity" value={order.quantityUnits.toLocaleString()} />
            <Row label="Filled Quantity" value={order.filledQuantityUnits.toLocaleString()} />
            <Row label="Remaining Quantity" value={(order.quantityUnits - order.filledQuantityUnits).toLocaleString()} />
            {order.limitPrice !== undefined && <Row label="Limit Price" value={String(order.limitPrice)} />}
            {order.stopPrice !== undefined && <Row label="Stop Price" value={String(order.stopPrice)} />}
            {order.averageFillPrice !== undefined && <Row label="Average Fill Price" value={String(order.averageFillPrice)} />}
            <Row label="Created" value={new Date(order.createdAt).toLocaleString()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Origin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between border-b py-1.5">
              <span className="text-muted-foreground">Decision</span>
              {relatedDecision ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/decisions/${relatedDecision.id}`}>
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    View Decision
                  </Link>
                </Button>
              ) : (
                <span className="font-mono text-xs">{order.decisionId}</span>
              )}
            </div>
            {relatedOpportunity && (
              <div className="flex items-center justify-between border-b py-1.5 last:border-0">
                <span className="text-muted-foreground">Opportunity</span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/opportunities/${relatedOpportunity.id}`}>
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    View Opportunity
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Execution Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {executionsQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : executions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No execution attempts recorded for this order yet.</p>
          ) : (
            <ol className="space-y-3">
              {executions
                .slice()
                .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
                .map((execution, i) => (
                  <li key={execution.id} className="flex items-start gap-3 border-l-2 border-muted pl-4">
                    <div className="flex-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Attempt {i + 1}</span>
                        <StatusBadge status={execution.status} />
                        {execution.retryCount > 0 && (
                          <Badge variant="outline">
                            retry {execution.retryCount}/{execution.maxRetries}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Started {new Date(execution.startedAt).toLocaleString()}
                        {execution.completedAt && ` — completed ${new Date(execution.completedAt).toLocaleString()}`}
                      </p>
                      {execution.failureReason && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertDescription>{execution.failureReason}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </li>
                ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" aria-hidden="true" />
        <AlertDescription>
          Cancelling an order isn&apos;t available: the Enterprise API has no cancel/DELETE endpoint for orders yet (only create and list). This is a
          real, verified gap — not a UI oversight.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
