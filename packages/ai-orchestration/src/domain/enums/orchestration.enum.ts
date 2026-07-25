export enum DelegationStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REASSIGNED = "REASSIGNED",
}

export const DELEGATION_STATUSES = Object.values(DelegationStatus) as readonly DelegationStatus[];
