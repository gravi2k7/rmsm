"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
} from "@rmsm/ui";
import { useAccessibleOrganizations } from "@/features/billing-shared/hooks/use-accessible-organizations";
import { useAssignLicense, useRevokeLicense } from "../hooks/use-licenses";
import { ApiError } from "@/lib/api-client";
import type { License } from "../types";

export function LicenseActionsMenu({ license }: { license: License }) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [orgId, setOrgId] = useState<string>("");
  const organizations = useAccessibleOrganizations();
  const assignLicense = useAssignLicense(license.id);
  const revokeLicense = useRevokeLicense();

  async function handleAssign() {
    if (!orgId) return;
    try {
      await assignLicense.mutateAsync({ organizationId: orgId });
      toast.success("License assigned.");
      setAssignOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to assign license.");
    }
  }

  async function handleRevoke() {
    try {
      await revokeLicense.mutateAsync(license.id);
      toast.success("License revoked.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to revoke license.");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {license.status === "UNASSIGNED" && <DropdownMenuItem onClick={() => setAssignOpen(true)}>Assign to Organization…</DropdownMenuItem>}
          {license.status === "ACTIVE" && (
            <DropdownMenuItem className="text-destructive" onClick={handleRevoke}>
              Revoke License
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign License {license.key}</DialogTitle>
          </DialogHeader>
          <Select value={orgId} onValueChange={setOrgId}>
            <SelectTrigger>
              <SelectValue placeholder="Select organization…" />
            </SelectTrigger>
            <SelectContent>
              {(organizations.data?.items ?? []).map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Lists organizations your admin account has access to. The assign action itself is platform-wide — this list is a lookup convenience, not an
            API restriction.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAssign} disabled={!orgId || assignLicense.isPending}>
              {assignLicense.isPending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
