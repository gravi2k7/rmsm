import type { EventPublisher } from "../events/event-publisher.interface";
import type { PlanningDomainEvent } from "../events/planning-domain-events.interface";

export type PlanningEventListener = (event: PlanningDomainEvent) => void | Promise<void>;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners: PlanningEventListener[] = [];

  subscribe(listener: PlanningEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  async publish(events: readonly PlanningDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) {
        await listener(event);
      }
    }
  }
}
