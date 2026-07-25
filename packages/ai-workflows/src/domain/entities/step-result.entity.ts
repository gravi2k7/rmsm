import type { StepStatus } from "../enums/workflow.enum";

export interface StepResult {
  readonly stepId: string;
  readonly status: StepStatus;
  readonly output?: unknown;
  readonly error?: string;
  readonly attempts: number;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
}
