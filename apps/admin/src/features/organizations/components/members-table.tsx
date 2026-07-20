"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast, Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, Badge } from "@rmsm/ui";
import { MoreHorizontal } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ORGANIZATION_ROLES } from "../types";
import type { Member } from "../types";
import { useSuspendMember, useReactivateMember, useRemoveMember, useUpdateMemberRole } from "../hooks/use-organizations";
import { ApiError } from "@/lib/api-client";

function membershipBadgeVariant(status: Member["status"]): "success" | "warning" | "destructive" {
  if (status === "ACTIVE") return "success";
  if (status === "SUSPENDED") return "warning";
  return "destructive";
}

export function MembersTable({
  organizationId,
  members,
  isLoading,
  error,
  onRetry,
}: {
  organizationId: string;
  members: Member[] | undefined;
  isLoading: boolean;
  error?: unknown;
  onRetry: () => void;
}) {
  const suspendMember = useSuspendMember(organizationId);
  const reactivateMember = useReactivateMember(organizationId);
  const removeMember = useRemoveMember(organizationId);
  const updateRole = useUpdateMemberRole(organizationId);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function run(id: string, action: () => Promise<unknown>, successMessage: string, errorMessage: string) {
    setBusyId(id);
    try {
      await action();
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : errorMessage);
    } finally {
      setBusyId(null);
    }
  }

  const columns: ColumnDef<Member, unknown>[] = [
    { accessorKey: "user.email", header: "Email", cell: ({ row }) => row.original.user.email },
    { accessorKey: "role", header: "Role" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={membershipBadgeVariant(row.original.status)}>{row.original.status}</Badge>,
    },
    { accessorKey: "joinedAt", header: "Joined", cell: ({ row }) => new Date(row.original.joinedAt).toLocaleDateString() },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const member = row.original;
        const isOwner = member.role === "OWNER";
        const isBusy = busyId === member.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isOwner || isBusy} aria-label={`Actions for ${member.user.email}`}>
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {ORGANIZATION_ROLES.filter((r) => r !== member.role).map((role) => (
                <DropdownMenuItem
                  key={role}
                  onSelect={() => run(member.id, () => updateRole.mutateAsync({ membershipId: member.id, role }), `Role changed to ${role}.`, "Failed to change role.")}
                >
                  Change role to {role}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {member.status === "ACTIVE" ? (
                <DropdownMenuItem onSelect={() => run(member.id, () => suspendMember.mutateAsync(member.id), "Member suspended.", "Failed to suspend member.")}>Suspend</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => run(member.id, () => reactivateMember.mutateAsync(member.id), "Member reactivated.", "Failed to reactivate member.")}>Reactivate</DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => run(member.id, () => removeMember.mutateAsync(member.id), "Member removed.", "Failed to remove member.")}
              >
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={members}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No members yet"
      emptyDescription="Invite someone to get started."
    />
  );
}
