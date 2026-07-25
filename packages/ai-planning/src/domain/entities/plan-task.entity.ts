import type { TaskStatus } from "../enums/planning.enum";

/** One node in an `ExecutionPlan`'s task graph. `dependsOn` holds the ids
 * of tasks that must reach `COMPLETED` before this one becomes `READY` —
 * the sole mechanism `TaskGraphService` uses for dependency resolution. */
export interface PlanTask {
  readonly id: string;
  readonly description: string;
  readonly dependsOn: readonly string[];
  readonly status: TaskStatus;
  readonly result?: unknown;
  readonly error?: string;
}

export interface PlanTaskDraft {
  readonly id: string;
  readonly description: string;
  readonly dependsOn: readonly string[];
}
