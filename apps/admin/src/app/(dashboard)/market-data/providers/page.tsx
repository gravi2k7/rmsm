"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useProviders, useProviderDiagnostics } from "@/features/market-data-providers/hooks/use-providers";
import { EditPriorityDialog } from "@/features/market-data-providers/components/edit-priority-dialog";
import { TestConnectionButton } from "@/features/market-data-providers/components/test-connection-button";
import { QuickSyncDialog } from "@/features/market-data-providers/components/quick-sync-dialog";
import { formatDate } from "@/features/billing-shared/format";
import type { ProviderConfig } from "@/features/market-data-shared/types";

export default function ProvidersPage() {
  const providers = useProviders();
  const diagnostics = useProviderDiagnostics();
  const diagnosticsById = new Map((diagnostics.data ?? []).map((d) => [d.providerConfigId, d]));

  const columns: ColumnDef<ProviderConfig, unknown>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "type", header: "Type" },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const d = diagnosticsById.get(row.original.id);
        if (!d) return "—";
        return <StatusBadge status={d.registered && d.enabled && d.circuitState === "closed" ? "ACTIVE" : d.circuitState === "open" ? "REJECTED" : "PENDING"} />;
      },
    },
    {
      id: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <span>{row.original.priority}</span>
          <EditPriorityDialog provider={row.original} />
        </div>
      ),
    },
    {
      id: "credential",
      header: "API Key Status",
      cell: ({ row }) => {
        const d = diagnosticsById.get(row.original.id);
        if (!d) return "—";
        return <Badge variant={d.credential.configured ? "success" : "warning"}>{d.credential.configured ? "Configured" : d.credential.requirement}</Badge>;
      },
    },
    { id: "rateLimit", header: "Rate Limit / min", cell: ({ row }) => row.original.rateLimitPerMinute ?? "Unlimited" },
    { id: "lastTest", header: "Last Test", cell: ({ row }) => (row.original.lastConnectionTestAt ? `${formatDate(row.original.lastConnectionTestAt)} (${row.original.lastConnectionTestStatus ?? "—"})` : "Never tested") },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <TestConnectionButton providerId={row.original.id} />
          <QuickSyncDialog provider={row.original} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Providers"
        description="Provider priority, credential status, and connection health. Providers are created via platform configuration, not this UI — there is no create/enable/disable endpoint, only priority and connection testing."
      />
      <DataTable
        columns={columns}
        data={providers.data}
        isLoading={providers.isLoading}
        error={providers.error}
        onRetry={() => providers.refetch()}
        emptyTitle="No providers configured"
      />
    </div>
  );
}
