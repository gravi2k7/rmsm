import type { Clock, IdGenerator } from "@rmsm/core";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { HitlDomainEvent } from "../../events/hitl-domain-events.interface";

export class FixedClock implements Clock {
  constructor(private current: Date = new Date("2026-01-01T00:00:00.000Z")) {}
  now(): Date {
    return this.current;
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
  public readonly published: HitlDomainEvent[] = [];
  async publish(events: readonly HitlDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}
