import type { EventPublisher } from "../events/event-publisher.interface";
import type { AgentSecurityDomainEvent } from "../events/agent-security-domain-events.interface";

export type AgentSecurityEventListener = (event: AgentSecurityDomainEvent) => void | Promise<void>;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners: AgentSecurityEventListener[] = [];

  subscribe(listener: AgentSecurityEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  async publish(events: readonly AgentSecurityDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) {
        await listener(event);
      }
    }
  }
}
