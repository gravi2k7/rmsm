import { Badge } from "@rmsm/ui";
import type { BadgeProps } from "@rmsm/ui";

const POSITIVE = ["PRODUCTION", "PAPER_TRADING", "CONFIRMED", "APPROVED", "FILLED", "COMPLETED", "OPEN", "ACCEPTED"];
const NEGATIVE = ["ARCHIVED", "REJECTED", "CANCELLED", "EXPIRED", "FAILED"];
const CAUTION = ["PENDING", "MANUAL_REVIEW", "PARTIALLY_FILLED", "SUBMITTED", "TESTING", "DRAFT"];

/** One shared status-to-badge-variant mapping, since the same status
 * vocabulary (PENDING/APPROVED/REJECTED/etc.) recurs, with the same
 * intuitive color meaning, across Strategy/Opportunity/Decision/
 * Execution/Portfolio — rather than five separate ad-hoc mappings that
 * could drift out of visual consistency with each other. */
export function statusBadgeVariant(status: string): NonNullable<BadgeProps["variant"]> {
  if (POSITIVE.includes(status)) return "success";
  if (NEGATIVE.includes(status)) return "destructive";
  if (CAUTION.includes(status)) return "warning";
  return "secondary";
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={statusBadgeVariant(status)}>{status.replace(/_/g, " ")}</Badge>;
}
