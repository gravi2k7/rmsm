import type { EventPublisher } from "../events/event-publisher.interface";
import type { ExtractionDomainEvent } from "../events/extraction-domain-events.interface";

export type ExtractionEventListener = (event: ExtractionDomainEvent) => void | Promise<void>;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners: ExtractionEventListener[] = [];

  subscribe(listener: ExtractionEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  async publish(events: readonly ExtractionDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) {
        await listener(event);
      }
    }
  }
}
