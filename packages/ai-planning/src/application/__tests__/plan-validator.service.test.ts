import { describe, expect, it } from "vitest";
import { PlanValidatorService } from "../services/plan-validator.service";
import { PlanStatus, TaskStatus } from "../../domain/enums/planning.enum";
import type { ExecutionPlan } from "../../domain/entities/execution-plan.entity";

function planWith(tasks: ExecutionPlan["tasks"]): ExecutionPlan {
  return {
    id: "plan-1",
    goalId: "goal-1",
    goalDescription: "test",
    tasks,
    status: PlanStatus.DRAFT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("PlanValidatorService", () => {
  const validator = new PlanValidatorService();

  it("accepts a well-formed acyclic plan", () => {
    const result = validator.validate(
      planWith([
        { id: "a", description: "a", dependsOn: [], status: TaskStatus.READY },
        { id: "b", description: "b", dependsOn: ["a"], status: TaskStatus.PENDING },
      ]),
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects an empty task list", () => {
    const result = validator.validate(planWith([]));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("no tasks"))).toBe(true);
  });

  it("rejects a plan with a cyclic dependency", () => {
    const result = validator.validate(
      planWith([
        { id: "a", description: "a", dependsOn: ["b"], status: TaskStatus.PENDING },
        { id: "b", description: "b", dependsOn: ["a"], status: TaskStatus.PENDING },
      ]),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Cyclic"))).toBe(true);
  });

  it("rejects a plan referencing an unknown dependency", () => {
    const result = validator.validate(planWith([{ id: "a", description: "a", dependsOn: ["ghost"], status: TaskStatus.PENDING }]));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("unknown"))).toBe(true);
  });
});
