import type { Clock, IdGenerator } from "@rmsm/core";
import type { AgentGoal } from "@rmsm/ai-agents";
import type { WorkerRegistry } from "../../repositories/worker-registry.interface";
import type { DelegationRepository } from "../../repositories/delegation-repository.interface";
import type { WorkerExecutor } from "../../repositories/worker-executor.interface";
import type { DelegationTask } from "../../domain/entities/delegation-task.entity";
import { DelegationStatus } from "../../domain/enums/orchestration.enum";
import { NoEligibleWorkerError, DelegationNotFoundError } from "../../domain/errors/orchestration-domain.errors";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type {
  TaskDelegatedEvent,
  DelegationCompletedEvent,
  DelegationFailedEvent,
  DelegationReassignedEvent,
} from "../../events/orchestration-domain-events.interface";

/**
 * The "coordinator agent" capability. `delegate()` finds every worker
 * registered for the required capability, then walks them in
 * registration order: run the goal on the first eligible worker; if it
 * fails, reassign to the next eligible worker (publishing
 * `DelegationReassigned`) rather than giving up — this IS "failure
 * recovery." Only once every eligible worker has failed does the
 * delegation itself end up `FAILED`.
 */
export class DelegationService {
  constructor(
    private readonly workerRegistry: WorkerRegistry,
    private readonly delegationRepository: DelegationRepository,
    private readonly workerExecutor: WorkerExecutor,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async delegate(coordinatorId: string, goal: AgentGoal, requiredCapability: string): Promise<DelegationTask> {
    const eligibleWorkers = await this.workerRegistry.findByCapability(requiredCapability);
    if (eligibleWorkers.length === 0) {
      throw new NoEligibleWorkerError(requiredCapability);
    }

    const delegationId = this.idGenerator.generate();
    const now = this.clock.now();

    let task: DelegationTask = {
      id: delegationId,
      coordinatorId,
      workerId: eligibleWorkers[0]!.agentId,
      requiredCapability,
      goal,
      status: DelegationStatus.PENDING,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    const delegatedEvent: TaskDelegatedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "TaskDelegated",
      occurredAt: now,
      aggregateId: delegationId,
      delegationId,
      coordinatorId,
      workerId: task.workerId,
    };
    await this.publish([delegatedEvent]);

    for (let index = 0; index < eligibleWorkers.length; index += 1) {
      const worker = eligibleWorkers[index]!;
      const attemptedTask: DelegationTask = {
        ...task,
        workerId: worker.agentId,
        status: DelegationStatus.RUNNING,
        attempts: task.attempts + 1,
        reassignedFromWorkerId: index === 0 ? undefined : eligibleWorkers[index - 1]!.agentId,
        updatedAt: this.clock.now(),
      };
      task = attemptedTask;

      const result = await this.workerExecutor.execute(worker.agentId, goal);

      if (result.success) {
        task = { ...task, status: DelegationStatus.COMPLETED, result: result.output, updatedAt: this.clock.now() };
        await this.delegationRepository.save(task);

        const completedEvent: DelegationCompletedEvent = {
          eventId: this.idGenerator.generate(),
          kind: "DelegationCompleted",
          occurredAt: task.updatedAt,
          aggregateId: delegationId,
          delegationId,
          workerId: worker.agentId,
        };
        await this.publish([completedEvent]);
        return task;
      }

      const hasNextWorker = index + 1 < eligibleWorkers.length;
      if (hasNextWorker) {
        const nextWorker = eligibleWorkers[index + 1]!;
        const reassignedEvent: DelegationReassignedEvent = {
          eventId: this.idGenerator.generate(),
          kind: "DelegationReassigned",
          occurredAt: this.clock.now(),
          aggregateId: delegationId,
          delegationId,
          fromWorkerId: worker.agentId,
          toWorkerId: nextWorker.agentId,
        };
        await this.publish([reassignedEvent]);
        task = { ...task, status: DelegationStatus.REASSIGNED, error: result.error, updatedAt: this.clock.now() };
      } else {
        task = { ...task, status: DelegationStatus.FAILED, error: result.error, updatedAt: this.clock.now() };
        await this.delegationRepository.save(task);

        const failedEvent: DelegationFailedEvent = {
          eventId: this.idGenerator.generate(),
          kind: "DelegationFailed",
          occurredAt: task.updatedAt,
          aggregateId: delegationId,
          delegationId,
          workerId: worker.agentId,
          error: result.error ?? "unknown error",
        };
        await this.publish([failedEvent]);
      }
    }

    return task;
  }

  async getDelegation(delegationId: string): Promise<DelegationTask> {
    const task = await this.delegationRepository.findById(delegationId);
    if (!task) {
      throw new DelegationNotFoundError(delegationId);
    }
    return task;
  }

  private async publish(
    events: readonly (TaskDelegatedEvent | DelegationCompletedEvent | DelegationFailedEvent | DelegationReassignedEvent)[],
  ): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
