import { describe, expect, it } from "vitest";
import { PlanReflectorService } from "../services/plan-reflector.service";
import { PlanStatus, TaskStatus } from "../../domain/enums/planning.enum";
import type { ExecutionPlan } from "../../domain/entities/execution-plan.entity";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

function buildPlan(): ExecutionPlan {
  return {
    id: "plan-1",
    goalId: "goal-1",
    goalDescription: "test",
    tasks: [
      { id: "a", description: "a", dependsOn: [], status: TaskStatus.COMPLETED },
      { id: "b", description: "b", dependsOn: ["a"], status: TaskStatus.FAILED },
    ],
    status: PlanStatus.EXECUTING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("PlanReflectorService", () => {
  it("recommends re-planning when a tracked task failed", async () => {
    const events = new RecordingEventPublisher();
    const reflector = new PlanReflectorService(new FixedClock(), new SequentialIdGenerator(), events);

    const result = await reflector.reflect(buildPlan(), [
      { taskId: "a", status: TaskStatus.COMPLETED },
      { taskId: "b", status: TaskStatus.FAILED, error: "boom" },
    ]);

    expect(result.shouldReplan).toBe(true);
    expect(result.failedTaskIds).toEqual(["b"]);
    expect(events.published.some((e) => e.kind === "PlanReflected")).toBe(true);
  });

  it("does not recommend re-planning when every tracked task succeeded", async () => {
    const reflector = new PlanReflectorService(new FixedClock(), new SequentialIdGenerator());
    const result = await reflector.reflect(buildPlan(), [{ taskId: "a", status: TaskStatus.COMPLETED }]);

    expect(result.shouldReplan).toBe(false);
    expect(result.failedTaskIds).toEqual([]);
  });
});
