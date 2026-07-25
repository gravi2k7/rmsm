import type { PlanTaskDraft } from "../domain/entities/plan-task.entity";

/** The provider-independence seam for "Goal decomposition" — turning a
 * natural-language goal into an ordered set of task drafts with their
 * dependency edges. Exactly one deterministic implementation ships
 * today (`SequentialGoalDecomposer`); a future LLM-backed decomposer
 * implements this same interface with zero change to
 * `PlanningService`. */
export interface GoalDecomposer {
  decompose(goalId: string, goalDescription: string): Promise<readonly PlanTaskDraft[]>;
}
