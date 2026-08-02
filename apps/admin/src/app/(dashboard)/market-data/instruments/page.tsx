"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Input, Sheet, SheetContent, SheetHeader, SheetTitle, Alert, AlertDescription } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/features/billing-shared/format";
import { useInstruments } from "@/features/market-data-instruments/hooks/use-instruments";
import type { Instrument } from "@/features/market-data-shared/types";

const columns: ColumnDef<Instrument, unknown>[] = [
  { accessorKey: "symbol", header: "Symbol" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "assetClass", header: "Asset Class" },
  { accessorKey: "currency", header: "Currency" },
  { id: "tickSize", header: "Tick Size", cell: ({ row }) => row.original.tickSize ?? "—" },
  { id: "lotSize", header: "Lot Size", cell: ({ row }) => row.original.lotSize ?? "—" },
  { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
];

export default function InstrumentsPage() {
  const [filterText, setFilterText] = useState("");
  const [selected, setSelected] = useState<Instrument | null>(null);

  const instruments = useInstruments();

  const filteredRows = useMemo(() => {
    const rows = instruments.data?.data ?? [];
    const needle = filterText.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => r.symbol.toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle));
  }, [instruments.data, filterText]);

  return (
    <div>
      <PageHeader
        title="Instruments"
        description="Read-only instrument master — this API has no create/update/delete endpoint for instruments (Instrument Master is populated by provider synchronization, not admin entry)."
      />

      <Alert className="mb-4">
        <AlertDescription>
          The instrument list endpoint rejects any query parameter (search, asset class, status, or page) due to a request-validation
          conflict in the existing API — sending one causes the whole request to fail, so this page can only load a single
          unfiltered page from the server (
          {instruments.data ? `${instruments.data.pagination.pageSize} of ${instruments.data.pagination.totalCount} instruments` : "loading…"}
          ). The box below filters within that loaded page only, not the full instrument set.
        </AlertDescription>
      </Alert>

      <div className="mb-4">
        <Input placeholder="Filter loaded instruments by symbol or name…" value={filterText} onChange={(e) => setFilterText(e.target.value)} className="sm:max-w-xs" />
      </div>

      <DataTable
        columns={columns}
        data={instruments.isLoading ? undefined : filteredRows}
        isLoading={instruments.isLoading}
        error={instruments.error}
        onRetry={() => instruments.refetch()}
        onRowClick={(row) => setSelected(row)}
        emptyTitle={filterText ? "No loaded instruments match this filter" : "No instruments returned"}
      />

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.symbol} — {selected.name}</SheetTitle>
              </SheetHeader>
              <dl className="mt-6 space-y-3 text-sm">
                {[
                  ["Exchange ID", selected.exchangeId],
                  ["Asset Class", selected.assetClass],
                  ["Status", selected.status],
                  ["Currency", selected.currency],
                  ["ISIN", selected.isin ?? "—"],
                  ["CUSIP", selected.cusip ?? "—"],
                  ["Tick Size", selected.tickSize ?? "—"],
                  ["Lot Size", selected.lotSize ?? "—"],
                  ["Point Value", selected.pointValue ?? "—"],
                  ["Listed", formatDate(selected.listedAt)],
                  ["Delisted", formatDate(selected.delistedAt)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 border-b pb-2">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
