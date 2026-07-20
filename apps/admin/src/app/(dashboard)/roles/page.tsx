"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast, Badge, Button } from "@rmsm/ui";
import { Settings2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { useRoles, useDeleteRole } from "@/features/rbac/hooks/use-rbac";
import { CreateRoleDialog } from "@/features/rbac/components/create-role-dialog";
import { RolePermissionsDialog } from "@/features/rbac/components/role-permissions-dialog";
import type { RoleWithPermissions } from "@/features/rbac/types";
import { ApiError } from "@/lib/api-client";

export default function RolesPage() {
  const roles = useRoles();
  const deleteRole = useDeleteRole();
  const [selected, setSelected] = useState<RoleWithPermissions | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleDelete(role: RoleWithPermissions) {
    try {
      await deleteRole.mutateAsync(role.id);
      toast.success(`Role "${role.name}" deleted.`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to delete role.");
    }
  }

  const columns: ColumnDef<RoleWithPermissions, unknown>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "description", header: "Description", cell: ({ row }) => row.original.description ?? "—" },
    { id: "system", header: "Type", cell: ({ row }) => <Badge variant={row.original.isSystem ? "secondary" : "outline"}>{row.original.isSystem ? "System" : "Custom"}</Badge> },
    { id: "permissionCount", header: "Permissions", cell: ({ row }) => row.original.rolePermissions.length },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelected(row.original);
              setDialogOpen(true);
            }}
          >
            <Settings2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Permissions
          </Button>
          {!row.original.isSystem && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.original);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Roles" description="Roles and their granted permissions." actions={<CreateRoleDialog />} />

      <DataTable columns={columns} data={roles.data} isLoading={roles.isLoading} error={roles.error} onRetry={() => roles.refetch()} emptyTitle="No roles yet" />

      <RolePermissionsDialog role={selected} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
