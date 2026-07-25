import type { EventPublisher } from "../events/event-publisher.interface";
import type { RagDomainEvent } from "../events/rag-domain-events.interface";

export type RagEventListener = (event: RagDomainEvent) => void | Promise<void>;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners: RagEventListener[] = [];

  subscribe(listener: RagEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  async publish(events: readonly RagDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) {
        await listener(event);
      }
    }
  }
}
