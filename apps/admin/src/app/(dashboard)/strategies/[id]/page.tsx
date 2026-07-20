"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@rmsm/ui";
import { Card, CardContent, CardHeader, CardTitle, Button, Switch, Label, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@rmsm/ui";
import { ChevronDown, Archive } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingState, ErrorState } from "@/components/shared/data-states";
import { useStrategy, useUpdateStrategy, useArchiveStrategy } from "@/features/strategies/hooks/use-strategies";
import { ALLOWED_STRATEGY_TRANSITIONS, type StrategyStatus } from "@/features/strategies/types";
import { ApiError } from "@/lib/api-client";

export default function StrategyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const strategy = useStrategy(id);
  const updateStrategy = useUpdateStrategy(id);
  const archiveStrategy = useArchiveStrategy();

  if (strategy.isLoading) return <LoadingState />;
  if (strategy.error || !strategy.data) return <ErrorState error={strategy.error} onRetry={() => strategy.refetch()} />;

  const data = strategy.data;
  const availableTransitions = ALLOWED_STRATEGY_TRANSITIONS[data.status];

  async function handleTransition(next: StrategyStatus) {
    try {
      await updateStrategy.mutateAsync({ status: next });
      toast.success(`Strategy moved to ${next}.`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update strategy status.");
    }
  }

  async function handleToggleEnabled(enabled: boolean) {
    try {
      await updateStrategy.mutateAsync({ enabled });
      toast.success(enabled ? "Strategy enabled." : "Strategy disabled.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update strategy.");
    }
  }

  async function handleArchive() {
    try {
      await archiveStrategy.mutateAsync(id);
      toast.success("Strategy archived.");
      router.push("/strategies");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to archive strategy.");
    }
  }

  return (
    <div>
      <PageHeader
        title={data.name}
        description={data.description}
        actions={
          <>
            {availableTransitions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={updateStrategy.isPending}>
                    Change Status
                    <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {availableTransitions.map((status) => (
                    <DropdownMenuItem key={status} onSelect={() => handleTransition(status)}>
                      {status.replace(/_/g, " ")}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {data.status !== "ARCHIVED" && (
              <Button variant="destructive" onClick={handleArchive} disabled={archiveStrategy.isPending}>
                <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
                Archive
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={data.status} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled-toggle" className="text-muted-foreground">
                Enabled
              </Label>
              <Switch id="enabled-toggle" checked={data.enabled} onCheckedChange={handleToggleEnabled} disabled={updateStrategy.isPending || data.status === "ARCHIVED"} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Risk Tolerance</span>
              <span>{data.riskTolerance}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Timeframe</span>
              <span>{data.timeframe}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Versions</span>
              <span>{data.versionCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Risk / Trade</span>
              <span>{(data.maxRiskPerTrade * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Leverage</span>
              <span>{data.maxLeverage}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Open Positions</span>
              <span>{data.maxOpenPositions}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Supported Symbols</span>
              <p className="mt-1">{data.supportedSymbols.join(", ")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
