import type { WorkflowStatus } from "../enums/workflow.enum";
import type { StepResult } from "./step-result.entity";

/** The "execution history" capability's unit of record — one full run
 * of a `WorkflowDefinition`, with every step's outcome. */
export interface WorkflowExecution {
  readonly id: string;
  readonly workflowId: string;
  readonly status: WorkflowStatus;
  readonly stepResults: readonly StepResult[];
  readonly startedAt: Date;
  readonly completedAt: Date | null;
}
