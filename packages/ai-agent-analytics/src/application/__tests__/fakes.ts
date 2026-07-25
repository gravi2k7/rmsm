import type { Clock, IdGenerator } from "@rmsm/core";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { AgentAnalyticsDomainEvent } from "../../events/agent-analytics-domain-events.interface";

export class FixedClock implements Clock {
  private current: number;
  constructor(start: Date = new Date("2026-01-01T00:00:00.000Z")) {
    this.current = start.getTime();
  }
  now(): Date {
    return new Date(this.current);
  }
  advanceMs(ms: number): void {
    this.current += ms;
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
  public readonly published: AgentAnalyticsDomainEvent[] = [];
  async publish(events: readonly AgentAnalyticsDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}
