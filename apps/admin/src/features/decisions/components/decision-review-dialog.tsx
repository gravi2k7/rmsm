"use client";

import { useState } from "react";
import { toast } from "@rmsm/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Textarea, Label, Badge } from "@rmsm/ui";
import { CheckCircle2, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { useApproveDecision, useRejectDecision } from "../hooks/use-decisions";
import type { Decision } from "../types";
import { ApiError } from "@/lib/api-client";

export function DecisionReviewDialog({ decision, open, onOpenChange }: { decision: Decision | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [comments, setComments] = useState("");
  const approve = useApproveDecision();
  const reject = useRejectDecision();

  if (!decision) return null;

  const isPending = decision.status === "PENDING";

  async function handleApprove() {
    if (!decision) return;
    try {
      await approve.mutateAsync({ id: decision.id, comments: comments || undefined });
      toast.success("Decision approved.");
      onOpenChange(false);
      setComments("");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to approve decision.");
    }
  }

  async function handleReject() {
    if (!decision) return;
    try {
      await reject.mutateAsync({ id: decision.id, comments: comments || undefined });
      toast.success("Decision rejected.");
      onOpenChange(false);
      setComments("");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to reject decision.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Decision Review</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status={decision.status} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Risk Score</span>
            <span>{decision.riskScore.toFixed(1)} / 100</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Risk Assessment</span>
            <Badge variant={decision.riskPassed ? "success" : "destructive"}>{decision.riskPassed ? "Passed" : "Failed"}</Badge>
          </div>
          {decision.failedRiskChecks.length > 0 && (
            <div>
              <span className="text-muted-foreground">Failed Checks</span>
              <ul className="mt-1 list-inside list-disc">
                {decision.failedRiskChecks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Position Size</span>
            <span>
              {decision.positionSizeUnits.toLocaleString()} units ({decision.positionSizeBasis})
            </span>
          </div>
          {decision.decidedBy && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Decided By</span>
              <span>{decision.decidedBy}</span>
            </div>
          )}

          {isPending && (
            <div className="space-y-2">
              <Label htmlFor="comments">Comments (optional)</Label>
              <Textarea id="comments" value={comments} onChange={(e) => setComments(e.target.value)} rows={3} />
            </div>
          )}
        </div>

        {isPending && (
          <DialogFooter>
            <Button variant="destructive" onClick={handleReject} disabled={approve.isPending || reject.isPending}>
              <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approve.isPending || reject.isPending || !decision.riskPassed}
              title={!decision.riskPassed ? "Cannot approve: risk assessment failed" : undefined}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Approve
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
