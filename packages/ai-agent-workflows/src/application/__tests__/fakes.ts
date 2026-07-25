import type { Clock, IdGenerator } from "@rmsm/core";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { AgentWorkflowDomainEvent } from "../../events/agent-workflow-domain-events.interface";

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
  public readonly published: AgentWorkflowDomainEvent[] = [];
  async publish(events: readonly AgentWorkflowDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

/** Waits until `predicate()` is true, polling on microtasks — used to
 * observe `AgentWorkflowRunner`'s background (fire-and-forget)
 * execution completing without a fixed sleep. */
export async function waitUntil(predicate: () => boolean | Promise<boolean>, maxIterations = 2000): Promise<void> {
  for (let i = 0; i < maxIterations; i += 1) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error("waitUntil: condition not met within max iterations");
}
