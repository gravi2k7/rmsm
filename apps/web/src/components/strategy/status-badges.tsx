import { Badge } from "@rmsm/ui";
import type { ApprovalDecision, StrategyStatus, StrategyVersionStatus } from "@/types/strategy";

const STRATEGY_STATUS_VARIANT: Record<StrategyStatus, "success" | "secondary"> = {
  ACTIVE: "success",
  ARCHIVED: "secondary",
};

export function StrategyStatusBadge({ status }: { status: StrategyStatus }) {
  return <Badge variant={STRATEGY_STATUS_VARIANT[status]}>{status}</Badge>;
}

const VERSION_STATUS_VARIANT: Record<StrategyVersionStatus, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  DRAFT: "secondary",
  PENDING_VALIDATION: "warning",
  VALIDATED: "default",
  PENDING_APPROVAL: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  PUBLISHED: "success",
  SUPERSEDED: "secondary",
};

export function VersionStatusBadge({ status }: { status: StrategyVersionStatus }) {
  return <Badge variant={VERSION_STATUS_VARIANT[status]}>{status.replace(/_/g, " ")}</Badge>;
}

const APPROVAL_VARIANT: Record<ApprovalDecision, "warning" | "success" | "destructive"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
};

export function ApprovalDecisionBadge({ decision }: { decision: ApprovalDecision }) {
  return <Badge variant={APPROVAL_VARIANT[decision]}>{decision}</Badge>;
}
