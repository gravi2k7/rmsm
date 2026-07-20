import { Badge } from "@rmsm/ui";
import type { BadgeProps } from "@rmsm/ui";

const POSITIVE = ["PRODUCTION", "PAPER_TRADING", "CONFIRMED", "APPROVED", "FILLED", "COMPLETED", "OPEN", "ACCEPTED", "ACTIVE"];
const NEGATIVE = ["ARCHIVED", "REJECTED", "CANCELLED", "EXPIRED", "FAILED"];
const CAUTION = ["PENDING", "MANUAL_REVIEW", "PARTIALLY_FILLED", "SUBMITTED", "TESTING", "DRAFT", "IN_PROGRESS"];

/** One shared status-to-badge-variant mapping, since the same status
 * vocabulary (PENDING/APPROVED/REJECTED/etc.) recurs, with the same
 * intuitive color meaning, across Strategy/Opportunity/Decision/
 * Execution/Portfolio — ported directly from apps/admin's own
 * `components/shared/status-badge.tsx` rather than reinventing it. */
export function statusBadgeVariant(status: string): NonNullable<BadgeProps["variant"]> {
  if (POSITIVE.includes(status)) return "success";
  if (NEGATIVE.includes(status)) return "destructive";
  if (CAUTION.includes(status)) return "warning";
  return "secondary";
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={statusBadgeVariant(status)}>{status.replace(/_/g, " ")}</Badge>;
}
