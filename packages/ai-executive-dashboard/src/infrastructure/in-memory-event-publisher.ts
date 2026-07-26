import type { EventPublisher } from "../events/event-publisher.interface";
import type { ExecutiveDashboardDomainEvent } from "../events/executive-dashboard-domain-events.interface";

export type ExecutiveDashboardEventListener = (event: ExecutiveDashboardDomainEvent) => void;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners = new Set<ExecutiveDashboardEventListener>();

  subscribe(listener: ExecutiveDashboardEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async publish(events: readonly ExecutiveDashboardDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) listener(event);
    }
  }
}
