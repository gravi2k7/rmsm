import type { Clock, IdGenerator } from "@rmsm/core";
import type { AgentGoal } from "@rmsm/ai-agents";
import type { GoalDecomposer } from "../../repositories/goal-decomposer.interface";
import type { PlanRepository } from "../../repositories/plan-repository.interface";
import type { ExecutionPlan } from "../../domain/entities/execution-plan.entity";
import { PlanStatus, TaskStatus } from "../../domain/enums/planning.enum";
import { InvalidPlanError, PlanNotFoundError } from "../../domain/errors/planning-domain.errors";
import { TaskGraphService } from "./task-graph.service";
import { PlanValidatorService } from "./plan-validator.service";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { PlanCreatedEvent, PlanValidatedEvent } from "../../events/planning-domain-events.interface";

/** AI-404's entry point: "Goal decomposition" (via the injected
 * `GoalDecomposer`) plus "execution planning" (assembling the resulting
 * task drafts into a validated `ExecutionPlan` with initial readiness
 * already resolved). */
export class PlanningService {
  constructor(
    private readonly goalDecomposer: GoalDecomposer,
    private readonly planRepository: PlanRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly taskGraph: TaskGraphService = new TaskGraphService(),
    private readonly validator: PlanValidatorService = new PlanValidatorService(taskGraph),
    private readonly eventPublisher?: EventPublisher,
  ) {}

  /** Convenience entry point for AI-401 callers: plans directly from an
   * `AgentGoal`, using its `id` as the plan's `goalId` and its
   * `description` as the text to decompose. */
  async createPlanForGoal(goal: AgentGoal): Promise<ExecutionPlan> {
    return this.createPlan(goal.description, goal.id);
  }

  async createPlan(goalDescription: string, goalId?: string): Promise<ExecutionPlan> {
    const resolvedGoalId = goalId ?? this.idGenerator.generate();
    const drafts = await this.goalDecomposer.decompose(resolvedGoalId, goalDescription);
    const now = this.clock.now();

    const initialTasks = drafts.map((draft) => ({ ...draft, status: TaskStatus.PENDING }));
    const readyTasks = this.taskGraph.applyReadiness(initialTasks);

    const draftPlan: ExecutionPlan = {
      id: this.idGenerator.generate(),
      goalId: resolvedGoalId,
      goalDescription,
      tasks: readyTasks,
      status: PlanStatus.DRAFT,
      createdAt: now,
      updatedAt: now,
    };

    const validation = this.validator.validate(draftPlan);
    const plan: ExecutionPlan = { ...draftPlan, status: validation.valid ? PlanStatus.VALID : PlanStatus.INVALID };

    await this.planRepository.save(plan);

    const createdEvent: PlanCreatedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "PlanCreated",
      occurredAt: now,
      aggregateId: plan.id,
      planId: plan.id,
      goalId: resolvedGoalId,
      taskCount: plan.tasks.length,
    };
    const validatedEvent: PlanValidatedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "PlanValidated",
      occurredAt: now,
      aggregateId: plan.id,
      planId: plan.id,
      valid: validation.valid,
      errorCount: validation.errors.length,
    };
    await this.publish([createdEvent, validatedEvent]);

    if (!validation.valid) {
      throw new InvalidPlanError(validation.errors);
    }

    return plan;
  }

  async getPlan(planId: string): Promise<ExecutionPlan> {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new PlanNotFoundError(planId);
    }
    return plan;
  }

  private async publish(events: readonly (PlanCreatedEvent | PlanValidatedEvent)[]): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
