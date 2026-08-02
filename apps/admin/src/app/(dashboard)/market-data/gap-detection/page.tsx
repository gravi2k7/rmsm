"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Tabs, TabsList, TabsTrigger, TabsContent, Button, toast } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/features/billing-shared/format";
import { useGaps, useGapStatistics, useRepairGap } from "@/features/market-data-gaps/hooks/use-gaps";
import { DetectGapsDialog } from "@/features/market-data-gaps/components/detect-gaps-dialog";
import { SimpleBarChart } from "@/features/market-data-shared/components/simple-bar-chart";
import { DATA_GAP_STATUSES } from "@/features/market-data-shared/types";
import type { DataGap } from "@/features/market-data-shared/types";
import { ApiError } from "@/lib/api-client";

function RepairButton({ gap }: { gap: DataGap }) {
  const repair = useRepairGap();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={repair.isPending}
      onClick={async () => {
        try {
          await repair.mutateAsync(gap.id);
          toast.success("Repair attempted.");
        } catch (e) {
          toast.error(e instanceof ApiError ? e.message : "Repair failed.");
        }
      }}
    >
      {repair.isPending ? "Repairing…" : "Repair"}
    </Button>
  );
}

export default function GapDetectionPage() {
  const [status, setStatus] = useState<string>("DETECTED");
  const gaps = useGaps(status);
  const stats = useGapStatistics();
  const chartData = DATA_GAP_STATUSES.map((s) => ({ label: s.replace(/_/g, " "), value: stats.counts[s] ?? 0 }));

  const columns: ColumnDef<DataGap, unknown>[] = [
    { accessorKey: "instrumentId", header: "Instrument", cell: ({ row }) => row.original.instrumentId.slice(0, 8) },
    { accessorKey: "interval", header: "Timeframe", cell: ({ row }) => row.original.interval.replace(/_/g, " ") },
    { accessorKey: "gapStart", header: "Gap Start", cell: ({ row }) => formatDate(row.original.gapStart) },
    { accessorKey: "gapEnd", header: "Gap End", cell: ({ row }) => formatDate(row.original.gapEnd) },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: "repairAttempts", header: "Repair Attempts" },
    { accessorKey: "detectedAt", header: "Detected", cell: ({ row }) => formatDate(row.original.detectedAt) },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (row.original.status === "DETECTED" || row.original.status === "UNRESOLVED" ? <RepairButton gap={row.original} /> : null),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gap Detection"
        description="Missing-candle detection and automatic repair via alternate providers."
        actions={<DetectGapsDialog />}
      />

      <SimpleBarChart title="Gaps by Status" data={chartData} emptyMessage="No gaps recorded." />

      <Tabs value={status} onValueChange={setStatus}>
        <TabsList>
          {DATA_GAP_STATUSES.map((s) => (
            <TabsTrigger key={s} value={s}>
              {s.replace(/_/g, " ")}
            </TabsTrigger>
          ))}
        </TabsList>
        {DATA_GAP_STATUSES.map((s) => (
          <TabsContent key={s} value={s}>
            <DataTable columns={columns} data={gaps.data} isLoading={gaps.isLoading} error={gaps.error} onRetry={() => gaps.refetch()} emptyTitle={`No ${s.toLowerCase().replace(/_/g, " ")} gaps`} />
          </TabsContent>
        ))}
      </Tabs>

      <p className="text-xs text-muted-foreground">
        There is no &quot;ignore gap&quot; endpoint in this API — only detect and repair are available, so an Ignore action is not
        offered here.
      </p>
    </div>
  );
}
