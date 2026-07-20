"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Plus, CheckCircle2 } from "lucide-react";
import { Button, Badge, Skeleton, Card, CardHeader, CardTitle, CardContent } from "@rmsm/ui";
import { EmptyState } from "@/components/ui-extra/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDecisions } from "@/features/decisions/hooks/use-decisions";
import { useOpportunities } from "@/features/opportunities/hooks/use-opportunities";
import { useStrategySummary } from "@/features/strategy-summary/hooks/use-strategy-summaries";
import { DecisionReviewDialog } from "@/features/decisions/components/decision-review-dialog";
import { CreateOrderDialog } from "@/features/execution/components/create-order-dialog";

export default function DecisionDetailPage() {
  const params = useParams<{ decisionId: string }>();
  const decisionsQuery = useDecisions();
  const opportunitiesQuery = useOpportunities();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);

  const decision = decisionsQuery.data?.items.find((d) => d.id === params.decisionId);
  const relatedOpportunity = opportunitiesQuery.data?.items.find((o) => o.id === decision?.opportunityId);
  const strategySummary = useStrategySummary(relatedOpportunity?.strategyId ?? null);

  if (decisionsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!decision) {
    return <EmptyState title="Decision not found" description="It may not exist, or you may not have access." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/decisions" aria-label="Back to Decision Center">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">Decision</h1>
              <StatusBadge status={decision.status} />
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{decision.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {decision.status === "PENDING" && (
            <Button onClick={() => setReviewOpen(true)}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Review
            </Button>
          )}
          {decision.status === "APPROVED" && (
            <Button onClick={() => setOrderOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Create Order
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Risk Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Risk Score" value={`${decision.riskScore.toFixed(1)} / 100`} />
            <Row
              label="Assessment"
              value=""
              valueNode={<Badge variant={decision.riskPassed ? "success" : "destructive"}>{decision.riskPassed ? "Passed" : "Failed"}</Badge>}
            />
            {decision.failedRiskChecks.length > 0 && (
              <div className="border-b py-1.5">
                <span className="text-muted-foreground">Failed Checks</span>
                <ul className="mt-1 list-inside list-disc">
                  {decision.failedRiskChecks.map((check) => (
                    <li key={check}>{check}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Execution Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Position Size" value={`${decision.positionSizeUnits.toLocaleString()} units`} />
            <Row label="Sizing Basis" value={decision.positionSizeBasis} />
            <Row label="Created" value={new Date(decision.createdAt).toLocaleString()} />
            {decision.decidedAt && <Row label="Decided" value={new Date(decision.decidedAt).toLocaleString()} />}
            {decision.decidedBy && <Row label="Decided By" value={decision.decidedBy} />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Supporting Opportunity</CardTitle>
          {relatedOpportunity && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/opportunities/${relatedOpportunity.id}`}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                View Opportunity
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {opportunitiesQuery.isLoading ? (
            <Skeleton className="h-5 w-full" />
          ) : relatedOpportunity ? (
            <>
              <Row label="Symbol" value={relatedOpportunity.symbolCode} />
              <Row label="Direction" value={relatedOpportunity.signalDirection} />
              <Row label="Confidence" value={`${relatedOpportunity.confidenceScore.toFixed(0)}%`} />
              <div className="flex justify-between border-b py-1.5 last:border-0">
                <span className="text-muted-foreground">Strategy</span>
                {strategySummary.data ? <span className="font-medium">{strategySummary.data.name}</span> : <span className="text-xs">—</span>}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">The supporting opportunity couldn&apos;t be found in the current feed.</p>
          )}
        </CardContent>
      </Card>

      <DecisionReviewDialog decision={decision} open={reviewOpen} onOpenChange={setReviewOpen} />
      <CreateOrderDialog
        open={orderOpen}
        onOpenChange={setOrderOpen}
        defaultDecisionId={decision.id}
        defaultSymbolCode={relatedOpportunity?.symbolCode}
        trigger={false}
      />
    </div>
  );
}

function Row({ label, value, valueNode }: { label: string; value: string; valueNode?: ReactNode }) {
  return (
    <div className="flex justify-between border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      {valueNode ?? <span className="font-medium">{value}</span>}
    </div>
  );
}
