export enum PlanStatus {
  DRAFT = "DRAFT",
  VALID = "VALID",
  INVALID = "INVALID",
  EXECUTING = "EXECUTING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export const PLAN_STATUSES = Object.values(PlanStatus) as readonly PlanStatus[];

export enum TaskStatus {
  PENDING = "PENDING",
  READY = "READY",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED",
}

export const TASK_STATUSES = Object.values(TaskStatus) as readonly TaskStatus[];
