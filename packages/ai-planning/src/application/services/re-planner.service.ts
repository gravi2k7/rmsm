import type { Clock, IdGenerator } from "@rmsm/core";
import type { PlanRepository } from "../../repositories/plan-repository.interface";
import type { ExecutionPlan } from "../../domain/entities/execution-plan.entity";
import type { ReflectionResult } from "../../domain/entities/reflection-result.entity";
import { PlanStatus, TaskStatus } from "../../domain/enums/planning.enum";
import { TaskGraphService } from "./task-graph.service";
import { PlanValidatorService } from "./plan-validator.service";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { PlanReplannedEvent } from "../../events/planning-domain-events.interface";

/** "Re-planning": given a `ReflectionResult` calling for it, produces a
 * NEW `ExecutionPlan` (linked to the original via `parentPlanId`) that
 * keeps every already-`COMPLETED` task as-is and resets every failed
 * task — plus any task that depended on one, directly or transitively —
 * back to `PENDING` so it becomes eligible to run again. No task is
 * re-decomposed or re-described; this is a structural retry, not a new
 * goal decomposition. */
export class RePlannerService {
  constructor(
    private readonly planRepository: PlanRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly taskGraph: TaskGraphService = new TaskGraphService(),
    private readonly validator: PlanValidatorService = new PlanValidatorService(taskGraph),
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async replan(plan: ExecutionPlan, reflection: ReflectionResult): Promise<ExecutionPlan> {
    const resetIds = this.collectDownstreamOf(plan, reflection.failedTaskIds);

    const resetTasks = plan.tasks.map((task) =>
      resetIds.has(task.id) ? { ...task, status: TaskStatus.PENDING, error: undefined, result: undefined } : task,
    );
    const readyTasks = this.taskGraph.applyReadiness(resetTasks);

    const now = this.clock.now();
    const draftPlan: ExecutionPlan = {
      id: this.idGenerator.generate(),
      goalId: plan.goalId,
      goalDescription: plan.goalDescription,
      tasks: readyTasks,
      status: PlanStatus.DRAFT,
      parentPlanId: plan.id,
      createdAt: now,
      updatedAt: now,
    };

    const validation = this.validator.validate(draftPlan);
    const newPlan: ExecutionPlan = { ...draftPlan, status: validation.valid ? PlanStatus.VALID : PlanStatus.INVALID };
    await this.planRepository.save(newPlan);

    const event: PlanReplannedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "PlanReplanned",
      occurredAt: now,
      aggregateId: newPlan.id,
      originalPlanId: plan.id,
      newPlanId: newPlan.id,
    };
    if (this.eventPublisher) {
      await this.eventPublisher.publish([event]);
    }

    return newPlan;
  }

  private collectDownstreamOf(plan: ExecutionPlan, failedTaskIds: readonly string[]): Set<string> {
    const dependents = new Map<string, string[]>();
    for (const task of plan.tasks) {
      for (const depId of task.dependsOn) {
        const list = dependents.get(depId) ?? [];
        list.push(task.id);
        dependents.set(depId, list);
      }
    }

    const affected = new Set<string>(failedTaskIds);
    const queue = [...failedTaskIds];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      for (const dependent of dependents.get(current) ?? []) {
        if (!affected.has(dependent)) {
          affected.add(dependent);
          queue.push(dependent);
        }
      }
    }

    return affected;
  }
}
