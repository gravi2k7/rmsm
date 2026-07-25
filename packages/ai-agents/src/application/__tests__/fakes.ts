import type { Clock, IdGenerator } from "@rmsm/core";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { AgentDomainEvent } from "../../events/agent-domain-events.interface";

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
  public readonly published: AgentDomainEvent[] = [];
  async publish(events: readonly AgentDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}
