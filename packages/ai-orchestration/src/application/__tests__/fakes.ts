import type { Clock, IdGenerator } from "@rmsm/core";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { OrchestrationDomainEvent } from "../../events/orchestration-domain-events.interface";
import type { WorkerExecutor } from "../../repositories/worker-executor.interface";
import type { WorkerExecutionResult } from "../../domain/entities/worker-execution-result.entity";
import type { AgentGoal } from "@rmsm/ai-agents";

export class SystemLikeClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

export class RecordingEventPublisher implements EventPublisher {
  public readonly published: OrchestrationDomainEvent[] = [];
  async publish(events: readonly OrchestrationDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

/** A deterministic, in-package `WorkerExecutor` test double: fails for
 * every worker id listed in `failingWorkerIds`, otherwise succeeds
 * echoing the goal description as output. Used to prove
 * `DelegationService`'s failure-recovery/reassignment logic without
 * needing a real `AgentRuntime` wired up for every test. */
export class ScriptedWorkerExecutor implements WorkerExecutor {
  public readonly attempts: string[] = [];
  constructor(private readonly failingWorkerIds: ReadonlySet<string>) {}

  async execute(workerId: string, goal: AgentGoal): Promise<WorkerExecutionResult> {
    this.attempts.push(workerId);
    if (this.failingWorkerIds.has(workerId)) {
      return { success: false, error: `worker ${workerId} failed` };
    }
    return { success: true, output: `handled: ${goal.description}` };
  }
}
