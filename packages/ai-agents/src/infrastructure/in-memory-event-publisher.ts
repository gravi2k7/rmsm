import type { EventPublisher } from "../events/event-publisher.interface";
import type { AgentDomainEvent } from "../events/agent-domain-events.interface";

export type AgentEventListener = (event: AgentDomainEvent) => void | Promise<void>;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners: AgentEventListener[] = [];

  subscribe(listener: AgentEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  async publish(events: readonly AgentDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) {
        await listener(event);
      }
    }
  }
}
