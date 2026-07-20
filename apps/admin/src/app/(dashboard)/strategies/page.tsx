"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Input } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useStrategies } from "@/features/strategies/hooks/use-strategies";
import { CreateStrategyDialog } from "@/features/strategies/components/create-strategy-dialog";
import type { Strategy } from "@/features/strategies/types";

const columns: ColumnDef<Strategy, unknown>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "riskTolerance", header: "Risk" },
  { accessorKey: "timeframe", header: "Timeframe" },
  { accessorKey: "maxLeverage", header: "Max Leverage" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: "enabled", header: "Enabled", cell: ({ row }) => (row.original.enabled ? "Yes" : "No") },
];

export default function StrategiesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const strategies = useStrategies({ pageSize: 50, search: search || undefined });

  return (
    <div>
      <PageHeader title="Strategies" description="Create, configure, and manage trading strategies." actions={<CreateStrategyDialog />} />

      <div className="mb-4 max-w-sm">
        <Input placeholder="Search strategies…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search strategies" />
      </div>

      <DataTable
        columns={columns}
        data={strategies.data?.items}
        isLoading={strategies.isLoading}
        error={strategies.error}
        onRetry={() => strategies.refetch()}
        onRowClick={(row) => router.push(`/strategies/${row.id}`)}
        emptyTitle="No strategies yet"
        emptyDescription="Create your first strategy to get started."
      />
    </div>
  );
}
