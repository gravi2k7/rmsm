"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Badge } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useOpportunities } from "@/features/opportunities/hooks/use-opportunities";
import type { Opportunity } from "@/features/opportunities/types";

const STATUS_FILTERS = ["ALL", "PENDING", "CONFIRMED", "EXPIRED", "REJECTED"] as const;

const columns: ColumnDef<Opportunity, unknown>[] = [
  { accessorKey: "symbolCode", header: "Symbol" },
  {
    accessorKey: "signalDirection",
    header: "Direction",
    cell: ({ row }) => <Badge variant={row.original.signalDirection === "BUY" ? "success" : "destructive"}>{row.original.signalDirection}</Badge>,
  },
  { accessorKey: "signalStrength", header: "Strength" },
  { accessorKey: "confidenceScore", header: "Confidence", cell: ({ row }) => `${row.original.confidenceScore.toFixed(0)}%` },
  { accessorKey: "trend", header: "Trend" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: "expiresAt", header: "Expires", cell: ({ row }) => new Date(row.original.expiresAt).toLocaleString() },
];

export default function OpportunitiesPage() {
  const opportunities = useOpportunities();
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [minConfidence, setMinConfidence] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let items = opportunities.data?.items ?? [];
    if (statusFilter !== "ALL") items = items.filter((o) => o.status === statusFilter);
    if (minConfidence) items = items.filter((o) => o.confidenceScore >= Number(minConfidence));
    if (search) items = items.filter((o) => o.symbolCode.toLowerCase().includes(search.toLowerCase()));
    return items;
  }, [opportunities.data, statusFilter, minConfidence, search]);

  return (
    <div>
      <PageHeader title="Opportunities" description="Live trade opportunities generated from strategy signals." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input placeholder="Search symbol…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[200px]" aria-label="Search by symbol" />
        <Input
          type="number"
          placeholder="Min confidence %"
          value={minConfidence}
          onChange={(e) => setMinConfidence(e.target.value)}
          className="max-w-[160px]"
          aria-label="Minimum confidence"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as (typeof STATUS_FILTERS)[number])}>
          <SelectTrigger className="max-w-[160px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "ALL" ? "All statuses" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={opportunities.isLoading}
        error={opportunities.error}
        onRetry={() => opportunities.refetch()}
        emptyTitle="No opportunities match these filters"
      />
    </div>
  );
}
