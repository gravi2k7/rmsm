import type { EventPublisher } from "../events/event-publisher.interface";
import type { ClassificationDomainEvent } from "../events/classification-domain-events.interface";

export type ClassificationEventListener = (event: ClassificationDomainEvent) => void | Promise<void>;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners: ClassificationEventListener[] = [];

  subscribe(listener: ClassificationEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  async publish(events: readonly ClassificationDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) {
        await listener(event);
      }
    }
  }
}
