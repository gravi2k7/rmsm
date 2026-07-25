import type { GoalDecomposer } from "../repositories/goal-decomposer.interface";
import type { PlanTaskDraft } from "../domain/entities/plan-task.entity";
import { EmptyGoalError } from "../domain/errors/planning-domain.errors";

/** The one real, deterministic `GoalDecomposer`. Splits a goal
 * description into clauses on sentence terminators and the words
 * "then"/"and then", producing a strictly sequential task chain (each
 * task depends on the one before it) — a conservative default that
 * never invents parallelism the goal text didn't literally suggest.
 * No LLM or external call of any kind. */
export class SequentialGoalDecomposer implements GoalDecomposer {
  async decompose(goalId: string, goalDescription: string): Promise<readonly PlanTaskDraft[]> {
    const trimmed = goalDescription.trim();
    if (!trimmed) {
      throw new EmptyGoalError();
    }

    const clauses = trimmed
      .split(/(?:\.\s+|\bthen\b|\band then\b)/i)
      .map((clause) => clause.trim())
      .filter((clause) => clause.length > 0);

    const effectiveClauses = clauses.length > 0 ? clauses : [trimmed];

    return effectiveClauses.map((description, index) => ({
      id: `${goalId}-task-${index + 1}`,
      description,
      dependsOn: index === 0 ? [] : [`${goalId}-task-${index}`],
    }));
  }
}
