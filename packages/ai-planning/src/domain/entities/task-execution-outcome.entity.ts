import type { TaskStatus } from "../enums/planning.enum";

/** The result of actually running one `PlanTask`, fed into
 * `PlanReflectorService` to decide whether re-planning is needed.
 * Deliberately separate from `PlanTask` itself: execution is outside
 * this package's scope (AI-401's `AgentRuntime` or a caller executes
 * tasks; this package only plans and reflects). */
export interface TaskExecutionOutcome {
  readonly taskId: string;
  readonly status: TaskStatus;
  readonly result?: unknown;
  readonly error?: string;
}
