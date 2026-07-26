import type { Clock, IdGenerator } from "@rmsm/core";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { ExecutiveDashboardDomainEvent } from "../../events/executive-dashboard-domain-events.interface";

export class FixedClock implements Clock {
  constructor(private current: Date = new Date("2026-01-08T00:00:00.000Z")) {}
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
  public readonly published: ExecutiveDashboardDomainEvent[] = [];
  async publish(events: readonly ExecutiveDashboardDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}
