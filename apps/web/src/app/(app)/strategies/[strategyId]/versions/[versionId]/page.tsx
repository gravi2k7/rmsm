"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
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
  useExecutionProfile,
  useSaveExecutionProfile,
  useSaveRdseV2ExecutionProfile,
} from "@/hooks/use-strategy-versions";
import { useStrategy } from "@/hooks/use-strategies";
import { useInstrument, useInstruments } from "@/features/market/hooks/use-market-data";
import { useTradingAccounts } from "@/features/trading/hooks/use-trading-accounts";
import { StrategyVersionBacktest } from "@/components/strategy/strategy-version-backtest";

function VersionDetailContent({
  strategyId,
  versionId,
}: {
  strategyId: string;
  versionId: string;
}) {
  const router = useRouter();
  const version = useStrategyVersion(versionId);
  const validateMutation = useValidateVersion(strategyId);
  const requestApprovalMutation = useRequestApproval(strategyId);
  const decideMutation = useDecideApproval(strategyId);
  const publishMutation = usePublishVersion(strategyId);
  const rollbackMutation = useRollbackVersion(strategyId);
  const strategy = useStrategy(strategyId);
  const executionProfile = useExecutionProfile(versionId);
  const saveExecutionProfile = useSaveExecutionProfile(strategyId, versionId);
  const saveRdseV2ExecutionProfile = useSaveRdseV2ExecutionProfile(strategyId, versionId);

  const [lastFindings, setLastFindings] = useState<
    { nodeId?: string; message: string; severity: string }[]
  >([]);
  const [decideOpen, setDecideOpen] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [comments, setComments] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [rollbackOpen, setRollbackOpen] = useState(false);

  const [rdseInstrumentId, setRdseInstrumentId] = useState("405ce3f2-51e6-43b6-b802-0d9283ac136a");
  const [rdseAccountId, setRdseAccountId] = useState("911075d9-afe3-40ea-a226-4c2aec1497e9");
  const [rdseHtf, setRdseHtf] = useState("FIFTEEN_MINUTES");
  const [rdseLtf, setRdseLtf] = useState("FIVE_MINUTES");
  const [rdseQuantity, setRdseQuantity] = useState("1");
  const [rdseRisk, setRdseRisk] = useState("0");
  const [rdseExecutionMode, setRdseExecutionMode] = useState<
    "PAPER_AUTO" | "SIGNAL_ONLY" | "DISABLED"
  >("PAPER_AUTO");

  const [instrumentSearch, setInstrumentSearch] = useState("");

  const instruments = useInstruments({
    query: instrumentSearch || undefined,
    status: "ACTIVE",
    page: 1,
    pageSize: 50,
  });

  const selectedInstrument = useInstrument(rdseInstrumentId);

  const tradingAccounts = useTradingAccounts(strategy.data?.organizationId);

  useEffect(() => {
    const parameters = executionProfile.data?.parameters;

    if (!parameters) return;

    if (parameters.runtime === "RDSE_V2" || parameters.runtime === "RDSE") {
      if (typeof parameters.instrumentId === "string") {
        setRdseInstrumentId(parameters.instrumentId);
      }

      if (typeof parameters.tradingAccountId === "string") {
        setRdseAccountId(parameters.tradingAccountId);
      }

      if (typeof parameters.htf === "string") {
        setRdseHtf(parameters.htf);
      }

      if (typeof parameters.ltf === "string") {
        setRdseLtf(parameters.ltf);
      }

      if (typeof parameters.quantity === "string") {
        setRdseQuantity(parameters.quantity);
      }

      if (typeof parameters.risk === "string") {
        setRdseRisk(parameters.risk);
      }

      if (
        parameters.executionMode === "PAPER_AUTO" ||
        parameters.executionMode === "SIGNAL_ONLY" ||
        parameters.executionMode === "DISABLED"
      ) {
        setRdseExecutionMode(parameters.executionMode);
      }
    }
  }, [executionProfile.data]);

  const timeframeOptions = [
    { value: "ONE_MINUTE", label: "1 Minute" },
    { value: "FIVE_MINUTES", label: "5 Minutes" },
    { value: "FIFTEEN_MINUTES", label: "15 Minutes" },
    { value: "THIRTY_MINUTES", label: "30 Minutes" },
    { value: "ONE_HOUR", label: "1 Hour" },
    { value: "FOUR_HOURS", label: "4 Hours" },
    { value: "ONE_DAY", label: "1 Day" },
  ];

  const instrumentOptions = [
    ...(selectedInstrument.data &&
    !instruments.data?.data.some((instrument) => instrument.id === selectedInstrument.data?.id)
      ? [selectedInstrument.data]
      : []),
    ...(instruments.data?.data ?? []),
  ];

  const accountOptions = tradingAccounts.data ?? [];

  if (version.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (version.isError || !version.data) {
    return (
      <EmptyState
        title="Version not found"
        description={version.error instanceof Error ? version.error.message : "Unknown error"}
      />
    );
  }

  const v = version.data;

  let entryTree = null;
  let exitTree = null;
  let ruleTreeError: string | null = null;

  try {
    entryTree = fromWireRuleTree(v.entryRules);
    exitTree = fromWireRuleTree(v.exitRules);
  } catch (e) {
    ruleTreeError = e instanceof Error ? e.message : "Could not parse this version's rule tree.";
  }

  return (
    <div className="rmsm-mobile-glass-page space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <div className="text-muted-foreground text-xs">{strategy.data?.name ?? "Strategy"}</div>
            <h1 className="text-xl font-semibold">Version {v.versionNumber}</h1>
          </div>
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
                  onError: (err) =>
                    toast.error(err instanceof Error ? err.message : "Validation failed to run."),
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
                  onError: (err) =>
                    toast.error(err instanceof Error ? err.message : "Failed to request approval."),
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
                <li
                  key={i}
                  className={f.severity === "ERROR" ? "text-destructive" : "text-warning"}
                >
                  [{f.severity}] {f.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {strategy.data?.name === "RDSE" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">RDSE Runtime</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">Runtime</label>
              <div className="text-sm font-medium">RDSE</div>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">Timeframe</label>
              <div className="bg-muted/30 h-9 rounded-md border px-3 py-2 text-sm">1 Minute</div>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">Instrument</label>
              <select
                className="bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={rdseInstrumentId}
                onChange={(event) => setRdseInstrumentId(event.target.value)}
              >
                {instrumentOptions.map((instrument) => (
                  <option key={instrument.id} value={instrument.id}>
                    {instrument.symbol ?? instrument.name ?? instrument.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">Trading Account</label>
              <select
                className="bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={rdseAccountId}
                onChange={(event) => setRdseAccountId(event.target.value)}
              >
                {accountOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">Quantity</label>
              <Input
                value={rdseQuantity}
                onChange={(event) => setRdseQuantity(event.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">Execution Mode</label>
              <select
                className="bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={rdseExecutionMode}
                onChange={(event) =>
                  setRdseExecutionMode(
                    event.target.value as "PAPER_AUTO" | "SIGNAL_ONLY" | "DISABLED",
                  )
                }
              >
                <option value="PAPER_AUTO">Paper Auto</option>
                <option value="SIGNAL_ONLY">Signal Only</option>
                <option value="DISABLED">Disabled</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <Button
                loading={saveExecutionProfile.isPending}
                disabled={!rdseInstrumentId || !rdseAccountId || !rdseQuantity}
                onClick={() =>
                  saveExecutionProfile.mutate(
                    {
                      runtime: "RDSE",
                      instrumentId: rdseInstrumentId,
                      timeframe: "ONE_MINUTE",
                      tradingAccountId: rdseAccountId,
                      quantity: rdseQuantity,
                      executionMode: rdseExecutionMode,
                    },
                    {
                      onSuccess: () => toast.success("RDSE execution profile saved."),
                      onError: (err) =>
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "Failed to save RDSE execution profile.",
                        ),
                    },
                  )
                }
              >
                Save RDSE Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">RDSE V2 Runtime</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">Runtime</label>
              <div className="text-sm font-medium">RDSE V2</div>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">Strategy</label>
              <div className="text-sm font-medium">{strategy.data?.name ?? strategyId}</div>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label htmlFor="rdse-instrument-search" className="text-muted-foreground text-xs">
                Instrument
              </label>

              <Input
                id="rdse-instrument-search"
                value={instrumentSearch}
                onChange={(e) => setInstrumentSearch(e.target.value)}
                placeholder="Search instrument by symbol or name..."
                aria-label="Search RDSE V2 instrument"
              />

              <select
                className="bg-background mt-2 h-10 w-full rounded-md border px-3 text-sm"
                value={rdseInstrumentId}
                onChange={(e) => setRdseInstrumentId(e.target.value)}
                aria-label="RDSE V2 instrument"
              >
                <option value="">Select instrument</option>

                {instrumentOptions.map((instrument) => (
                  <option key={instrument.id} value={instrument.id}>
                    {instrument.symbol} — {instrument.name}
                  </option>
                ))}
              </select>

              {selectedInstrument.data && (
                <div className="text-muted-foreground text-xs">
                  {selectedInstrument.data.symbol} · {selectedInstrument.data.name} ·{" "}
                  {selectedInstrument.data.assetClass}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="rdse-htf" className="text-muted-foreground text-xs">
                Higher Timeframe
              </label>

              <select
                id="rdse-htf"
                className="bg-background h-10 w-full rounded-md border px-3 text-sm"
                value={rdseHtf}
                onChange={(e) => setRdseHtf(e.target.value)}
                aria-label="RDSE V2 higher timeframe"
              >
                {timeframeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="rdse-ltf" className="text-muted-foreground text-xs">
                Lower Timeframe
              </label>

              <select
                id="rdse-ltf"
                className="bg-background h-10 w-full rounded-md border px-3 text-sm"
                value={rdseLtf}
                onChange={(e) => setRdseLtf(e.target.value)}
                aria-label="RDSE V2 lower timeframe"
              >
                {timeframeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label htmlFor="rdse-account" className="text-muted-foreground text-xs">
                Trading Account
              </label>

              <select
                id="rdse-account"
                className="bg-background h-10 w-full rounded-md border px-3 text-sm"
                value={rdseAccountId}
                onChange={(e) => setRdseAccountId(e.target.value)}
                aria-label="RDSE V2 trading account"
              >
                <option value="">Select trading account</option>

                {accountOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.type} · {account.currency}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="rdse-quantity" className="text-muted-foreground text-xs">
                Quantity
              </label>

              <Input
                id="rdse-quantity"
                type="number"
                min="0"
                step="any"
                value={rdseQuantity}
                onChange={(e) => setRdseQuantity(e.target.value)}
                aria-label="RDSE V2 quantity"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="rdse-risk" className="text-muted-foreground text-xs">
                Risk
              </label>

              <Input
                id="rdse-risk"
                type="number"
                min="0"
                step="any"
                value={rdseRisk}
                onChange={(e) => setRdseRisk(e.target.value)}
                aria-label="RDSE V2 risk"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="rdse-execution-mode" className="text-muted-foreground text-xs">
                Execution Mode
              </label>

              <select
                id="rdse-execution-mode"
                className="bg-background h-10 w-full rounded-md border px-3 text-sm"
                value={rdseExecutionMode}
                onChange={(e) =>
                  setRdseExecutionMode(e.target.value as "PAPER_AUTO" | "SIGNAL_ONLY" | "DISABLED")
                }
                aria-label="RDSE V2 execution mode"
              >
                <option value="PAPER_AUTO">Paper Auto-Execute</option>
                <option value="SIGNAL_ONLY">Signal Only</option>
                <option value="DISABLED">Disabled</option>
              </select>
            </div>

            <div className="flex items-end">
              <div className="bg-muted/30 text-muted-foreground rounded-md border px-3 py-2 text-xs">
                Runtime: RDSE V2
              </div>
            </div>

            <div className="md:col-span-2">
              <Button
                loading={saveRdseV2ExecutionProfile.isPending}
                disabled={
                  !rdseInstrumentId || !rdseAccountId || !rdseHtf || !rdseLtf || !rdseQuantity
                }
                onClick={() =>
                  saveRdseV2ExecutionProfile.mutate(
                    {
                      runtime: "RDSE_V2",
                      htf: rdseHtf,
                      ltf: rdseLtf,
                      instrumentId: rdseInstrumentId,
                      tradingAccountId: rdseAccountId,
                      quantity: rdseQuantity,
                      risk: rdseRisk,
                      executionMode: rdseExecutionMode,
                    },
                    {
                      onSuccess: () => toast.success("RDSE V2 execution profile saved."),
                      onError: (err) =>
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "Failed to save RDSE V2 execution profile.",
                        ),
                    },
                  )
                }
              >
                Save RDSE V2 Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <StrategyVersionBacktest
        versionId={v.id}
        defaultInstrumentId={rdseInstrumentId}
        defaultHtf={rdseHtf}
        defaultLtf={rdseLtf}
        runtime={
          typeof executionProfile.data?.parameters.runtime === "string"
            ? executionProfile.data.parameters.runtime
            : undefined
        }
      />

      {ruleTreeError ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-destructive text-sm">
              <div className="font-medium">Malformed rule tree</div>
              <div className="text-muted-foreground mt-1">{ruleTreeError}</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Entry Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <RuleTreeViewer node={entryTree!} findings={lastFindings} />
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Exit Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <RuleTreeViewer node={exitTree!} findings={lastFindings} />
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {v.parameters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted overflow-auto rounded-md p-3 text-xs">
              {JSON.stringify(v.parameters, null, 2)}
            </pre>
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
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              aria-label="Decision comments"
            />
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
                toast.success(
                  decideOpen === "APPROVED" ? "Version approved." : "Version rejected.",
                );
                setDecideOpen(null);
                setComments("");
              },
              onError: (err) =>
                toast.error(err instanceof Error ? err.message : "Failed to record decision."),
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
            onError: (err) =>
              toast.error(err instanceof Error ? err.message : "Failed to publish version."),
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
            onError: (err) =>
              toast.error(err instanceof Error ? err.message : "Failed to roll back version."),
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
