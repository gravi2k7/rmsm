import type { EventPublisher } from "../events/event-publisher.interface";
import type { HitlDomainEvent } from "../events/hitl-domain-events.interface";

export type HitlEventListener = (event: HitlDomainEvent) => void | Promise<void>;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners: HitlEventListener[] = [];

  subscribe(listener: HitlEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  async publish(events: readonly HitlDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) {
        await listener(event);
      }
    }
  }
}
