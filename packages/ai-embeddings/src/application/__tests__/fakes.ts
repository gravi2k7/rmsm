import type { Clock, IdGenerator } from "@rmsm/core";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { EmbeddingDomainEvent } from "../../events/embedding-domain-events.interface";

export class FixedClock implements Clock {
  constructor(private readonly current: Date) {}
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
  public readonly published: EmbeddingDomainEvent[] = [];
  async publish(events: readonly EmbeddingDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}
