import type { Clock, IdGenerator } from "@rmsm/core";
import type { ExecutionPlan } from "../../domain/entities/execution-plan.entity";
import type { TaskExecutionOutcome } from "../../domain/entities/task-execution-outcome.entity";
import type { ReflectionResult } from "../../domain/entities/reflection-result.entity";
import { TaskStatus } from "../../domain/enums/planning.enum";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { PlanReflectedEvent } from "../../events/planning-domain-events.interface";

/** "Reflection": given how a plan's tasks actually executed, decide
 * whether the plan needs to change. Purely a judgment step — it never
 * mutates the plan itself; `RePlannerService` acts on its verdict. */
export class PlanReflectorService {
  constructor(
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async reflect(plan: ExecutionPlan, outcomes: readonly TaskExecutionOutcome[]): Promise<ReflectionResult> {
    const failedTaskIds = outcomes.filter((outcome) => outcome.status === TaskStatus.FAILED).map((outcome) => outcome.taskId);
    const shouldReplan = failedTaskIds.length > 0;
    const reason = shouldReplan
      ? `${failedTaskIds.length} task(s) failed: ${failedTaskIds.join(", ")}`
      : "All tracked tasks completed successfully; no re-planning needed.";

    const result: ReflectionResult = { planId: plan.id, shouldReplan, reason, failedTaskIds };

    const event: PlanReflectedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "PlanReflected",
      occurredAt: this.clock.now(),
      aggregateId: plan.id,
      planId: plan.id,
      shouldReplan,
    };
    if (this.eventPublisher) {
      await this.eventPublisher.publish([event]);
    }

    return result;
  }
}
