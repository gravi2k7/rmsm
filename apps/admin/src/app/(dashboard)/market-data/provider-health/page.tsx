"use client";

import { useMemo, useState } from "react";
import { Activity, PlugZap, ShieldAlert, Gauge, Zap } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Button, toast } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingState, ErrorState } from "@/components/shared/data-states";
import { formatDate } from "@/features/billing-shared/format";
import { useProviderDiagnostics, useTestConnection } from "@/features/market-data-providers/hooks/use-providers";
import { useSynchronizationHealth } from "@/features/market-data-monitoring/hooks/use-monitoring";
import { ApiError } from "@/lib/api-client";
import type { ConnectionTestResult } from "@/features/market-data-shared/types";

export default function ProviderHealthPage() {
  const diagnostics = useProviderDiagnostics();
  const syncHealth = useSynchronizationHealth();
  const testConnection = useTestConnection();
  const [selectedId, setSelectedId] = useState<string>("");
  const [lastResult, setLastResult] = useState<ConnectionTestResult | null>(null);

  const selected = useMemo(() => {
    const providers = diagnostics.data ?? [];
    return providers.find((p) => p.providerConfigId === selectedId) ?? providers[0];
  }, [diagnostics.data, selectedId]);
  const providers = diagnostics.data ?? [];

  async function handleTest() {
    if (!selected) return;
    try {
      const result = await testConnection.mutateAsync(selected.providerConfigId);
      setLastResult(result);
      if (result.success) {
        toast.success(`Connection OK — ${result.latencyMs ?? "?"}ms`);
      } else {
        toast.error(result.message ?? "Connection failed");
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to test connection.");
    }
  }

  if (diagnostics.isLoading) return <LoadingState rows={4} />;
  if (diagnostics.error) return <ErrorState error={diagnostics.error} onRetry={() => diagnostics.refetch()} />;

  return (
    <div>
      <PageHeader title="Provider Health" description="Live connection status, circuit-breaker state, and on-demand latency testing." />

      <div className="mb-6 flex items-center gap-3">
        <Select value={selected?.providerConfigId ?? ""} onValueChange={setSelectedId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.providerConfigId} value={p.providerConfigId}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleTest} disabled={!selected || testConnection.isPending}>
          <PlugZap className="mr-2 h-4 w-4" aria-hidden="true" />
          {testConnection.isPending ? "Testing…" : "Run Live Test"}
        </Button>
      </div>

      {selected && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Response Time (last live test)"
              value={lastResult?.latencyMs !== undefined ? `${lastResult.latencyMs}ms` : "Not tested this session"}
              icon={Zap}
            />
            <StatCard label="Availability" value={selected.registered && selected.enabled ? "Registered" : "Not Registered"} icon={Activity} />
            <StatCard label="Rate Limit / min" value={selected.rateLimitPerMinute != null ? String(selected.rateLimitPerMinute) : "Unlimited"} icon={Gauge} />
            <StatCard label="Circuit Breaker" value={selected.circuitState} icon={ShieldAlert} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="mb-3 text-sm font-medium">Connection Status</p>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Last tested</dt><dd>{formatDate(selected.lastConnectionTestAt)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Last result</dt><dd><StatusBadge status={selected.lastConnectionTestStatus ?? "UNKNOWN"} /></dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Credential</dt><dd>{selected.credential.configured ? "Configured" : selected.credential.requirement}</dd></div>
              </dl>
            </div>
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">History</p>
              <p className="mt-2">
                No latency/error history endpoint exists for providers — only the most recent connection test result is persisted
                (<code>lastConnectionTestAt</code>/<code>lastConnectionTestStatus</code>). Errors and Warnings beyond circuit-breaker
                state are not exposed by this API. Platform-wide circuit summary:{" "}
                {syncHealth.data ? syncHealth.data.providers.map((p) => `${p.type}: ${p.circuitState}`).join(", ") : "loading…"}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
