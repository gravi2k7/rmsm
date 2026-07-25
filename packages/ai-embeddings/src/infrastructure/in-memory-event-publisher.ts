import type { EventPublisher } from "../events/event-publisher.interface";
import type { EmbeddingDomainEvent } from "../events/embedding-domain-events.interface";

export type EmbeddingEventListener = (event: EmbeddingDomainEvent) => void | Promise<void>;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners: EmbeddingEventListener[] = [];

  subscribe(listener: EmbeddingEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  async publish(events: readonly EmbeddingDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) {
        await listener(event);
      }
    }
  }
}
