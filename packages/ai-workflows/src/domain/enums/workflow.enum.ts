export enum StepStatus {
  PENDING = "pending",
  RUNNING = "running",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
  SKIPPED = "skipped",
  TIMED_OUT = "timed_out",
  CANCELLED = "cancelled",
}

export const STEP_STATUSES = Object.values(StepStatus) as readonly StepStatus[];

export enum WorkflowStatus {
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export const WORKFLOW_STATUSES = Object.values(WorkflowStatus) as readonly WorkflowStatus[];
