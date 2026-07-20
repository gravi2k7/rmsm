"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, TrendingUp, TrendingDown, ExternalLink, Plus } from "lucide-react";
import { Button, Badge, Skeleton, Card, CardHeader, CardTitle, CardContent, Alert, AlertDescription } from "@rmsm/ui";
import { EmptyState } from "@/components/ui-extra/empty-state";
import { useOpportunities } from "@/features/opportunities/hooks/use-opportunities";
import { useDecisions } from "@/features/decisions/hooks/use-decisions";
import { useStrategySummary } from "@/features/strategy-summary/hooks/use-strategy-summaries";
import { derivePriority } from "@/features/opportunities/lib/priority";
import { StatusBadge } from "@/components/shared/status-badge";
import { CreateOrderDialog } from "@/features/execution/components/create-order-dialog";
import { useState } from "react";

export default function OpportunityDetailPage() {
  const params = useParams<{ opportunityId: string }>();
  const opportunitiesQuery = useOpportunities();
  const decisionsQuery = useDecisions();
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);

  const opportunity = opportunitiesQuery.data?.items.find((o) => o.id === params.opportunityId);
  // Decision has no reverse lookup by opportunityId — this is a real
  // client-side scan of the already-fetched decisions list, same
  // approach used everywhere else in this app for endpoints with no
  // detail-by-id route.
  const relatedDecision = decisionsQuery.data?.items.find((d) => d.opportunityId === params.opportunityId);
  const strategySummary = useStrategySummary(opportunity?.strategyId ?? null);

  if (opportunitiesQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!opportunity) {
    return <EmptyState title="Opportunity not found" description="It may have expired, or the id is invalid." />;
  }

  const priority = derivePriority(opportunity);
  const isExpired = new Date(opportunity.expiresAt).getTime() < Date.now();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/opportunities" aria-label="Back to Opportunity Feed">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{opportunity.symbolCode}</h1>
              <StatusBadge status={opportunity.status} />
              <Badge variant={priority === "HIGH" ? "success" : priority === "MEDIUM" ? "warning" : "secondary"}>{priority} priority</Badge>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              {opportunity.signalDirection === "BUY" ? (
                <TrendingUp className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
              )}
              {opportunity.signalDirection} signal, {opportunity.signalStrength.toLowerCase()} strength
            </p>
          </div>
        </div>
      </div>

      {isExpired && opportunity.status === "PENDING" && (
        <Alert>
          <AlertDescription>This opportunity&apos;s expiry time has passed, though its status hasn&apos;t been updated to EXPIRED yet.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Signal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Confidence" value={`${opportunity.confidenceScore.toFixed(0)}%`} />
            <Row label="Trend" value={opportunity.trend} />
            <Row label="Volatility" value={opportunity.volatility} />
            <Row label="Liquidity" value={opportunity.liquidity} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Created" value={new Date(opportunity.createdAt).toLocaleString()} />
            <Row label="Expires" value={new Date(opportunity.expiresAt).toLocaleString()} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Origin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Strategy</span>
            {strategySummary.isLoading ? (
              <Skeleton className="h-5 w-32" />
            ) : strategySummary.data ? (
              <span className="font-medium">{strategySummary.data.name}</span>
            ) : (
              <span className="font-mono text-xs text-muted-foreground">{opportunity.strategyId}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Related Decision</CardTitle>
          {relatedDecision && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/decisions/${relatedDecision.id}`}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                View Decision
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="text-sm">
          {decisionsQuery.isLoading ? (
            <Skeleton className="h-5 w-full" />
          ) : relatedDecision ? (
            <div className="flex items-center justify-between">
              <StatusBadge status={relatedDecision.status} />
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">Risk score {relatedDecision.riskScore.toFixed(1)}</span>
                {relatedDecision.status === "APPROVED" && (
                  <Button size="sm" variant="outline" onClick={() => setOrderDialogOpen(true)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Create Order
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No decision has been made on this opportunity yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Reject is intentionally not offered here: no reject endpoint
          exists for Opportunities in the API (only Decisions support
          approve/reject) — a real, verified gap, not an oversight. */}

      <CreateOrderDialog
        open={orderDialogOpen}
        onOpenChange={setOrderDialogOpen}
        defaultDecisionId={relatedDecision?.id}
        defaultSymbolCode={opportunity.symbolCode}
        trigger={false}
      />
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
