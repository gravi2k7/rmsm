import type { RunStatus } from "../enums/run.enum";

/** The "checkpointing" / "workflow state" capabilities' unit of
 * record: an incrementally-updated snapshot of one long-running run,
 * built purely by observing AI-310's own `WorkflowDomainEvent` stream
 * (see `AgentWorkflowRunner`) — never by re-deriving step results
 * itself. */
export interface WorkflowRunState {
  readonly runId: string;
  readonly workflowId: string;
  readonly status: RunStatus;
  readonly completedStepIds: readonly string[];
  readonly failedStepIds: readonly string[];
  readonly retriedFromRunId?: string;
  readonly startedAt: Date;
  readonly updatedAt: Date;
}
