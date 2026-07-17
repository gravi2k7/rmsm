/**
 * A Strategy's own top-level lifecycle — distinct from
 * `StrategyVersionStatus` below. A Strategy (the aggregate identity —
 * "my RSI mean-reversion strategy") can be ACTIVE for a long time while
 * individual VERSIONS of it move through their own, separate draft →
 * approval → publish cycle. Archiving a Strategy doesn't delete it or
 * its history (this project's own standing "soft delete, never hard
 * delete business records" convention, established since EP-002) — it
 * just removes it from active use.
 */
export type StrategyStatus = "ACTIVE" | "ARCHIVED";

/**
 * A StrategyVersion's own lifecycle — item "Draft Workflow, Approval
 * Workflow, Publishing Workflow" made concrete as one real state
 * machine, the same discipline AI-102's own `IndicatorLifecycleState`
 * (execution-level) and `ServiceLifecycleState` (service-level)
 * established: a plain string union plus a real, checkable transition
 * table (`VERSION_STATUS_TRANSITIONS` below), not just documentation
 * prose a real implementation could silently violate.
 */
export type StrategyVersionStatus = "DRAFT" | "PENDING_VALIDATION" | "VALIDATED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "PUBLISHED" | "SUPERSEDED";

export const VERSION_STATUS_TRANSITIONS: Record<StrategyVersionStatus, StrategyVersionStatus[]> = {
  DRAFT: ["PENDING_VALIDATION"],
  PENDING_VALIDATION: ["VALIDATED", "DRAFT"], // a failed validation returns the version to DRAFT for correction, not a dead end
  VALIDATED: ["PENDING_APPROVAL", "DRAFT"], // an author can still pull a validated version back to draft before submitting it
  PENDING_APPROVAL: ["APPROVED", "REJECTED"],
  APPROVED: ["PUBLISHED"],
  REJECTED: ["DRAFT"], // a rejection is actionable feedback, not a terminal state — the author revises and resubmits
  PUBLISHED: ["SUPERSEDED"], // only superseded by a LATER version being published; a published version is never edited in place
  SUPERSEDED: [],
};
