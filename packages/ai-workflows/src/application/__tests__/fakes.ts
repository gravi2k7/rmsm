import type { Clock, IdGenerator } from "@rmsm/core";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { WorkflowDomainEvent } from "../../events/workflow-domain-events.interface";

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
  public readonly published: WorkflowDomainEvent[] = [];
  async publish(events: readonly WorkflowDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}
