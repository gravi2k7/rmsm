"use client";

import { useState } from "react";
import { toast } from "@rmsm/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Checkbox, Label } from "@rmsm/ui";
import { usePermissions, useGrantPermission, useRevokePermission } from "../hooks/use-rbac";
import type { Permission, RoleWithPermissions } from "../types";
import { ApiError } from "@/lib/api-client";

export function RolePermissionsDialog({ role, open, onOpenChange }: { role: RoleWithPermissions | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const permissions = usePermissions();
  const grantPermission = useGrantPermission();
  const revokePermission = useRevokePermission();
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (!role) return null;

  const grantedIds = new Set(role.rolePermissions.map((rp) => rp.permission.id));
  const grouped = (permissions.data ?? []).reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.group] ??= []).push(p);
    return acc;
  }, {});

  async function handleToggle(permissionId: string, checked: boolean) {
    if (!role) return;
    setPendingId(permissionId);
    try {
      if (checked) {
        await grantPermission.mutateAsync({ roleId: role.id, permissionId });
      } else {
        await revokePermission.mutateAsync({ roleId: role.id, permissionId });
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update permission.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role.name} — Permissions</DialogTitle>
          <DialogDescription>{role.isSystem ? "System role — permissions are seeded, but still editable here." : "Custom role."}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {Object.entries(grouped).map(([group, perms]) => (
            <div key={group}>
              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{group}</h4>
              <div className="space-y-2">
                {perms.map((permission) => (
                  <div key={permission.id} className="flex items-center gap-2">
                    <Checkbox
                      id={permission.id}
                      checked={grantedIds.has(permission.id)}
                      disabled={pendingId === permission.id}
                      onCheckedChange={(checked) => handleToggle(permission.id, checked === true)}
                    />
                    <Label htmlFor={permission.id} className="cursor-pointer text-sm font-normal">
                      {permission.key}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
