import { describe, expect, it } from "vitest";
import { RePlannerService } from "../services/re-planner.service";
import { InMemoryPlanRepository } from "../../infrastructure/in-memory-plan.repository";
import { PlanStatus, TaskStatus } from "../../domain/enums/planning.enum";
import type { ExecutionPlan } from "../../domain/entities/execution-plan.entity";
import type { ReflectionResult } from "../../domain/entities/reflection-result.entity";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

function buildPlan(): ExecutionPlan {
  return {
    id: "plan-1",
    goalId: "goal-1",
    goalDescription: "test",
    tasks: [
      { id: "a", description: "a", dependsOn: [], status: TaskStatus.COMPLETED },
      { id: "b", description: "b", dependsOn: ["a"], status: TaskStatus.FAILED, error: "boom" },
      { id: "c", description: "c", dependsOn: ["b"], status: TaskStatus.PENDING },
    ],
    status: PlanStatus.EXECUTING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("RePlannerService", () => {
  it("resets the failed task and its transitive dependents to PENDING/READY, keeping completed tasks as-is", async () => {
    const repository = new InMemoryPlanRepository();
    const events = new RecordingEventPublisher();
    const rePlanner = new RePlannerService(repository, new FixedClock(), new SequentialIdGenerator(), undefined, undefined, events);

    const plan = buildPlan();
    const reflection: ReflectionResult = { planId: plan.id, shouldReplan: true, reason: "b failed", failedTaskIds: ["b"] };

    const newPlan = await rePlanner.replan(plan, reflection);

    expect(newPlan.id).not.toBe(plan.id);
    expect(newPlan.parentPlanId).toBe(plan.id);
    expect(newPlan.tasks.find((t) => t.id === "a")?.status).toBe(TaskStatus.COMPLETED);
    expect(newPlan.tasks.find((t) => t.id === "b")?.status).toBe(TaskStatus.READY);
    expect(newPlan.tasks.find((t) => t.id === "c")?.status).toBe(TaskStatus.PENDING);
    expect(newPlan.status).toBe(PlanStatus.VALID);
    expect(await repository.findById(newPlan.id)).not.toBeNull();
    expect(events.published.some((e) => e.kind === "PlanReplanned")).toBe(true);
  });
});
