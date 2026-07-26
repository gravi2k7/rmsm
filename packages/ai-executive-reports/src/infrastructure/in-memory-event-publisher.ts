import type { EventPublisher } from "../events/event-publisher.interface";
import type { ExecutiveReportsDomainEvent } from "../events/executive-reports-domain-events.interface";

export type ExecutiveReportsEventListener = (event: ExecutiveReportsDomainEvent) => void;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners = new Set<ExecutiveReportsEventListener>();

  subscribe(listener: ExecutiveReportsEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async publish(events: readonly ExecutiveReportsDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) listener(event);
    }
  }
}
