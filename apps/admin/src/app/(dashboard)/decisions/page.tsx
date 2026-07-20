"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDecisions } from "@/features/decisions/hooks/use-decisions";
import { DecisionReviewDialog } from "@/features/decisions/components/decision-review-dialog";
import type { Decision } from "@/features/decisions/types";

const columns: ColumnDef<Decision, unknown>[] = [
  { accessorKey: "opportunityId", header: "Opportunity" },
  {
    accessorKey: "riskScore",
    header: "Risk Score",
    cell: ({ row }) => (
      <span className={row.original.riskPassed ? "text-success" : "text-destructive"}>{row.original.riskScore.toFixed(1)}</span>
    ),
  },
  {
    accessorKey: "riskPassed",
    header: "Risk Check",
    cell: ({ row }) => <Badge variant={row.original.riskPassed ? "success" : "destructive"}>{row.original.riskPassed ? "Passed" : "Failed"}</Badge>,
  },
  { accessorKey: "positionSizeUnits", header: "Position Size", cell: ({ row }) => row.original.positionSizeUnits.toLocaleString() },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: "createdAt", header: "Created", cell: ({ row }) => new Date(row.original.createdAt).toLocaleString() },
];

export default function DecisionsPage() {
  const decisions = useDecisions();
  const [selected, setSelected] = useState<Decision | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div>
      <PageHeader title="Decisions" description="Risk-assessed decisions awaiting approval or already decided." />

      <DataTable
        columns={columns}
        data={decisions.data?.items}
        isLoading={decisions.isLoading}
        error={decisions.error}
        onRetry={() => decisions.refetch()}
        onRowClick={(row) => {
          setSelected(row);
          setDialogOpen(true);
        }}
        emptyTitle="No decisions yet"
        emptyDescription="Decisions appear here once a strategy's opportunities go through risk assessment."
      />

      <DecisionReviewDialog decision={selected} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
