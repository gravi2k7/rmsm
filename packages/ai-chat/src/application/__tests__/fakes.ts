import type { IdGenerator } from "@rmsm/core";
import type { ChatDomainEvent } from "../../events/chat-domain-events.interface";
import type { EventPublisher } from "../../events/event-publisher.interface";

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

export class RecordingEventPublisher implements EventPublisher {
  public readonly published: ChatDomainEvent[] = [];
  async publish(events: readonly ChatDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}
