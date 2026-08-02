"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/features/billing-shared/format";
import { useLicenses } from "@/features/billing-licenses/hooks/use-licenses";
import { IssueLicenseDialog } from "@/features/billing-licenses/components/issue-license-dialog";
import { LicenseActionsMenu } from "@/features/billing-licenses/components/license-actions-menu";
import { LicenseDetailsSheet } from "@/features/billing-licenses/components/license-details-sheet";
import type { License } from "@/features/billing-licenses/types";

const columns: ColumnDef<License, unknown>[] = [
  { accessorKey: "key", header: "License Key" },
  { id: "organization", header: "Organization", cell: ({ row }) => row.original.organizationId ?? "Unassigned" },
  { accessorKey: "type", header: "Type" },
  { id: "seats", header: "Seats", cell: ({ row }) => row.original.seats ?? "Unlimited" },
  { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { id: "expiry", header: "Expiry", cell: ({ row }) => formatDate(row.original.expiresAt) },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <LicenseActionsMenu license={row.original} />
      </div>
    ),
  },
];

export default function LicenseManagementPage() {
  const licenses = useLicenses();
  const [selected, setSelected] = useState<License | null>(null);

  return (
    <div>
      <PageHeader title="License Management" description="Platform-wide license issuance, assignment, and revocation." actions={<IssueLicenseDialog />} />
      <DataTable
        columns={columns}
        data={licenses.data?.items}
        isLoading={licenses.isLoading}
        error={licenses.error}
        onRetry={() => licenses.refetch()}
        onRowClick={(row) => setSelected(row)}
        emptyTitle="No licenses issued yet"
      />
      <LicenseDetailsSheet license={selected} open={!!selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
