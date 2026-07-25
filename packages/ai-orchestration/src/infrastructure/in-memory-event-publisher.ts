import type { EventPublisher } from "../events/event-publisher.interface";
import type { OrchestrationDomainEvent } from "../events/orchestration-domain-events.interface";

export type OrchestrationEventListener = (event: OrchestrationDomainEvent) => void | Promise<void>;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners: OrchestrationEventListener[] = [];

  subscribe(listener: OrchestrationEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  async publish(events: readonly OrchestrationDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) {
        await listener(event);
      }
    }
  }
}
