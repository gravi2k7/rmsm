import { describe, expect, it } from "vitest";
import { PlanningService } from "../services/planning.service";
import { SequentialGoalDecomposer } from "../../infrastructure/sequential-goal.decomposer";
import { InMemoryPlanRepository } from "../../infrastructure/in-memory-plan.repository";
import { PlanStatus, TaskStatus } from "../../domain/enums/planning.enum";
import { InvalidPlanError, PlanNotFoundError } from "../../domain/errors/planning-domain.errors";
import type { GoalDecomposer } from "../../repositories/goal-decomposer.interface";
import type { PlanTaskDraft } from "../../domain/entities/plan-task.entity";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

function buildService(decomposer: GoalDecomposer = new SequentialGoalDecomposer()) {
  const repository = new InMemoryPlanRepository();
  const events = new RecordingEventPublisher();
  const service = new PlanningService(decomposer, repository, new FixedClock(), new SequentialIdGenerator(), undefined, undefined, events);
  return { service, repository, events };
}

describe("PlanningService", () => {
  it("creates a valid plan with tasks in the PENDING/READY state resolved from dependencies", async () => {
    const { service } = buildService();
    const plan = await service.createPlan("Gather requirements. Then implement it.", "goal-1");

    expect(plan.status).toBe(PlanStatus.VALID);
    expect(plan.tasks).toHaveLength(2);
    expect(plan.tasks[0]?.status).toBe(TaskStatus.READY);
    expect(plan.tasks[1]?.status).toBe(TaskStatus.PENDING);
  });

  it("persists the plan and publishes PlanCreated + PlanValidated", async () => {
    const { service, repository, events } = buildService();
    const plan = await service.createPlan("Write the report", "goal-2");

    expect(await repository.findById(plan.id)).not.toBeNull();
    expect(events.published.map((e) => e.kind)).toEqual(["PlanCreated", "PlanValidated"]);
  });

  it("createPlanForGoal delegates to createPlan using the AgentGoal's id and description", async () => {
    const { service } = buildService();
    const plan = await service.createPlanForGoal({ id: "goal-3", description: "Ship the feature" });
    expect(plan.goalId).toBe("goal-3");
  });

  it("throws PlanNotFoundError for an unknown plan id", async () => {
    const { service } = buildService();
    await expect(service.getPlan("missing")).rejects.toThrow(PlanNotFoundError);
  });

  it("saves an INVALID plan and throws InvalidPlanError when decomposition yields a broken graph", async () => {
    const brokenDecomposer: GoalDecomposer = {
      async decompose(): Promise<readonly PlanTaskDraft[]> {
        return [{ id: "t1", description: "t1", dependsOn: ["ghost"] }];
      },
    };
    const { service, repository } = buildService(brokenDecomposer);

    // The fake SequentialIdGenerator hands out "id-1" as the first id it
    // generates within this createPlan() call (the plan's own id, since
    // an explicit goalId is supplied and so no id is spent on it).
    await expect(service.createPlan("anything", "goal-4")).rejects.toThrow(InvalidPlanError);

    const saved = await repository.findById("id-1");
    expect(saved?.status).toBe(PlanStatus.INVALID);
  });
});
