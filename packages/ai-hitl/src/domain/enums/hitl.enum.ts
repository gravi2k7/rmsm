export enum ApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  ESCALATED = "ESCALATED",
}

export const APPROVAL_STATUSES = Object.values(ApprovalStatus) as readonly ApprovalStatus[];

export enum InterventionStatus {
  REQUESTED = "REQUESTED",
  RESOLVED = "RESOLVED",
}

export const INTERVENTION_STATUSES = Object.values(InterventionStatus) as readonly InterventionStatus[];
