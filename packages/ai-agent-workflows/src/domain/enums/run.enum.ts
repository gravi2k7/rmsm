/** Deliberately distinct from AI-310's own `WorkflowStatus` — this
 * enum tracks the AI-406 *run* (the long-running, checkpointed
 * wrapper), which has a genuine `RUNNING` state a single synchronous
 * `WorkflowEngine.run()` call never observably has from the outside
 * (its promise doesn't resolve until it's already terminal). */
export enum RunStatus {
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export const RUN_STATUSES = Object.values(RunStatus) as readonly RunStatus[];
