import type { EventPublisher } from "../events/event-publisher.interface";
import type { SummarizationDomainEvent } from "../events/summarization-domain-events.interface";

export type SummarizationEventListener = (event: SummarizationDomainEvent) => void | Promise<void>;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners: SummarizationEventListener[] = [];

  subscribe(listener: SummarizationEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  async publish(events: readonly SummarizationDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) {
        await listener(event);
      }
    }
  }
}
