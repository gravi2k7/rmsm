"use client";

import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@rmsm/ui";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/features/billing-shared/format";
import type { License } from "../types";

/** "License Details" / "License History": this API tracks a license's
 * lifecycle as a handful of nullable timestamp fields on the License row
 * itself (`issuedAt`/`assignedAt`/`revokedAt`) rather than a separate
 * audit/history table — there is no `GET .../history` endpoint to back a
 * richer timeline. This panel surfaces every field the API actually
 * returns, honestly, rather than fabricating a history feed. */
export function LicenseDetailsSheet({ license, open, onOpenChange }: { license: License | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        {license && (
          <>
            <SheetHeader>
              <SheetTitle>{license.key}</SheetTitle>
            </SheetHeader>
            <dl className="mt-6 space-y-4 text-sm">
              <Row label="Type" value={license.type} />
              <Row label="Status" value={<StatusBadge status={license.status} />} />
              <Row label="Seats" value={license.seats ?? "Unlimited"} />
              <Row label="Organization" value={license.organizationId ?? "Unassigned"} />
              <Row label="Issued" value={formatDate(license.issuedAt)} />
              <Row label="Assigned" value={formatDate(license.assignedAt)} />
              <Row label="Expires" value={formatDate(license.expiresAt)} />
              <Row label="Revoked" value={formatDate(license.revokedAt)} />
              <Row label="Notes" value={license.notes ?? "—"} />
            </dl>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
