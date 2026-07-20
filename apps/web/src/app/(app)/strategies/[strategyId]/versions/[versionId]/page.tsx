"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Textarea,
  toast,
} from "@rmsm/ui";
import { ShieldCheck, Send, RotateCcw, CheckCircle2, XCircle, ClipboardCheck } from "lucide-react";
import { EmptyState } from "@/components/ui-extra/empty-state";
import { SessionGate } from "@/components/ui-extra/session-gate";
import { ConfirmDialog } from "@/components/ui-extra/confirm-dialog";
import { VersionStatusBadge } from "@/components/strategy/status-badges";
import { RuleTreeViewer } from "@/components/strategy/rule-builder/rule-tree-viewer";
import { fromWireRuleTree } from "@/lib/rule-tree-mapper";
import {
  useDecideApproval,
  usePublishVersion,
  useRequestApproval,
  useRollbackVersion,
  useStrategyVersion,
  useValidateVersion,
} from "@/hooks/use-strategy-versions";

function VersionDetailContent({ strategyId, versionId }: { strategyId: string; versionId: string }) {
  const router = useRouter();
  const version = useStrategyVersion(versionId);
  const validateMutation = useValidateVersion(strategyId);
  const requestApprovalMutation = useRequestApproval(strategyId);
  const decideMutation = useDecideApproval(strategyId);
  const publishMutation = usePublishVersion(strategyId);
  const rollbackMutation = useRollbackVersion(strategyId);

  const [lastFindings, setLastFindings] = useState<{ nodeId?: string; message: string; severity: string }[]>([]);
  const [decideOpen, setDecideOpen] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [comments, setComments] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [rollbackOpen, setRollbackOpen] = useState(false);

  if (version.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (version.isError || !version.data) {
    return <EmptyState title="Version not found" description={version.error instanceof Error ? version.error.message : "Unknown error"} />;
  }

  const v = version.data;
  let entryTree, exitTree;
  try {
    entryTree = fromWireRuleTree(v.entryRules);
    exitTree = fromWireRuleTree(v.exitRules);
  } catch (e) {
    return <EmptyState title="Malformed rule tree" description={e instanceof Error ? e.message : "Could not parse this version's rule tree."} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Version {v.versionNumber}</h1>
          <VersionStatusBadge status={v.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {v.status === "DRAFT" && (
            <Button
              variant="outline"
              loading={validateMutation.isPending}
              onClick={() =>
                validateMutation.mutate(v.id, {
                  onSuccess: (result) => {
                    setLastFindings(result.findings);
                    if (result.passed) toast.success("Validation passed.");
                    else toast.error("Validation failed — see findings below.");
                  },
                  onError: (err) => toast.error(err instanceof Error ? err.message : "Validation failed to run."),
                })
              }
            >
              <ShieldCheck /> Validate
            </Button>
          )}
          {v.status === "VALIDATED" && (
            <Button
              variant="outline"
              loading={requestApprovalMutation.isPending}
              onClick={() =>
                requestApprovalMutation.mutate(v.id, {
                  onSuccess: () => toast.success("Approval requested."),
                  onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to request approval."),
                })
              }
            >
              <ClipboardCheck /> Request Approval
            </Button>
          )}
          {v.status === "PENDING_APPROVAL" && (
            <>
              <Button variant="outline" onClick={() => setDecideOpen("REJECTED")}>
                <XCircle /> Reject
              </Button>
              <Button onClick={() => setDecideOpen("APPROVED")}>
                <CheckCircle2 /> Approve
              </Button>
            </>
          )}
          {v.status === "APPROVED" && (
            <Button onClick={() => setPublishOpen(true)}>
              <Send /> Publish
            </Button>
          )}
          {(v.status === "PUBLISHED" || v.status === "SUPERSEDED") && (
            <Button variant="outline" onClick={() => setRollbackOpen(true)}>
              <RotateCcw /> Rollback to new draft
            </Button>
          )}
        </div>
      </div>

      {lastFindings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Validation findings</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {lastFindings.map((f, i) => (
                <li key={i} className={f.severity === "ERROR" ? "text-destructive" : "text-warning"}>
                  [{f.severity}] {f.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Entry Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <RuleTreeViewer node={entryTree} findings={lastFindings} />
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Exit Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <RuleTreeViewer node={exitTree} findings={lastFindings} />
            </ul>
          </CardContent>
        </Card>
      </div>

      {v.parameters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(v.parameters, null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={decideOpen !== null}
        onOpenChange={(open) => !open && setDecideOpen(null)}
        title={decideOpen === "APPROVED" ? "Approve version?" : "Reject version?"}
        description={
          <div className="space-y-2 text-left">
            <p>Optional comments for this decision.</p>
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} aria-label="Decision comments" />
          </div>
        }
        confirmLabel={decideOpen === "APPROVED" ? "Approve" : "Reject"}
        destructive={decideOpen === "REJECTED"}
        loading={decideMutation.isPending}
        onConfirm={() => {
          if (!decideOpen) return;
          decideMutation.mutate(
            { versionId: v.id, decision: decideOpen, comments: comments || undefined },
            {
              onSuccess: () => {
                toast.success(decideOpen === "APPROVED" ? "Version approved." : "Version rejected.");
                setDecideOpen(null);
                setComments("");
              },
              onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to record decision."),
            },
          );
        }}
      />

      <ConfirmDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title="Publish this version?"
        description="This makes it the strategy's live, published version."
        confirmLabel="Publish"
        loading={publishMutation.isPending}
        onConfirm={() =>
          publishMutation.mutate(v.id, {
            onSuccess: () => {
              toast.success("Version published.");
              setPublishOpen(false);
            },
            onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to publish version."),
          })
        }
      />

      <ConfirmDialog
        open={rollbackOpen}
        onOpenChange={setRollbackOpen}
        title="Roll back to a new draft?"
        description="Creates a new DRAFT version copying this version's own rule tree and parameters. This version itself stays immutable."
        confirmLabel="Roll back"
        loading={rollbackMutation.isPending}
        onConfirm={() =>
          rollbackMutation.mutate(v.id, {
            onSuccess: (created) => {
              toast.success(`New draft version ${created.versionNumber} created.`);
              setRollbackOpen(false);
              router.push(`/strategies/${strategyId}/versions/${created.id}`);
            },
            onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to roll back version."),
          })
        }
      />
    </div>
  );
}

export default function VersionDetailPage() {
  const params = useParams<{ strategyId: string; versionId: string }>();
  return (
    <SessionGate>
      <VersionDetailContent strategyId={params.strategyId} versionId={params.versionId} />
    </SessionGate>
  );
}
