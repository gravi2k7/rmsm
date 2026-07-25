import type { ExecutionPlan } from "../../domain/entities/execution-plan.entity";
import type { PlanValidationResult } from "../../domain/entities/plan-validation-result.entity";
import { TaskGraphService } from "./task-graph.service";

/** Plan validation: unique task ids, every dependency reference points
 * at a real task in the plan, and the dependency graph is acyclic.
 * Deliberately non-throwing — callers (`PlanningService`,
 * `RePlannerService`) decide what to do with an invalid result. */
export class PlanValidatorService {
  constructor(private readonly taskGraph: TaskGraphService = new TaskGraphService()) {}

  validate(plan: ExecutionPlan): PlanValidationResult {
    const errors: string[] = [];

    if (plan.tasks.length === 0) {
      errors.push("Plan has no tasks.");
    }

    const seen = new Set<string>();
    for (const task of plan.tasks) {
      if (seen.has(task.id)) {
        errors.push(`Duplicate task id: ${task.id}`);
      }
      seen.add(task.id);
    }

    try {
      this.taskGraph.buildLayers(plan.tasks);
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message);
      } else {
        throw error;
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
