import { describe, expect, it } from "vitest";
import { InMemoryPlanRepository } from "../in-memory-plan.repository";
import { PlanStatus } from "../../domain/enums/planning.enum";
import type { ExecutionPlan } from "../../domain/entities/execution-plan.entity";

function buildPlan(id: string): ExecutionPlan {
  return {
    id,
    goalId: "goal-1",
    goalDescription: "do the thing",
    tasks: [],
    status: PlanStatus.DRAFT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("InMemoryPlanRepository", () => {
  it("saves and retrieves a plan by id", async () => {
    const repo = new InMemoryPlanRepository();
    await repo.save(buildPlan("plan-1"));
    expect((await repo.findById("plan-1"))?.id).toBe("plan-1");
  });

  it("returns null for an unknown plan id", async () => {
    const repo = new InMemoryPlanRepository();
    expect(await repo.findById("missing")).toBeNull();
  });
});
