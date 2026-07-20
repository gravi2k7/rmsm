"use client";

import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { CreateOrganizationDialog } from "@/features/organizations/components/create-organization-dialog";
import type { Organization } from "@/features/organizations/types";

const columns: ColumnDef<Organization, unknown>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "slug", header: "Slug" },
  { accessorKey: "country", header: "Country", cell: ({ row }) => row.original.country ?? "—" },
  { accessorKey: "currency", header: "Currency" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
];

export default function OrganizationsPage() {
  const router = useRouter();
  const organizations = useOrganizations();

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Organizations your admin account belongs to."
        actions={<CreateOrganizationDialog />}
      />

      <DataTable
        columns={columns}
        data={organizations.data?.items}
        isLoading={organizations.isLoading}
        error={organizations.error}
        onRetry={() => organizations.refetch()}
        onRowClick={(row) => router.push(`/organizations/${row.id}`)}
        emptyTitle="No organizations yet"
      />
    </div>
  );
}
