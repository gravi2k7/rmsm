import type { EventPublisher } from "../events/event-publisher.interface";
import type { AgentWorkflowDomainEvent } from "../events/agent-workflow-domain-events.interface";

export type AgentWorkflowEventListener = (event: AgentWorkflowDomainEvent) => void | Promise<void>;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners: AgentWorkflowEventListener[] = [];

  subscribe(listener: AgentWorkflowEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  async publish(events: readonly AgentWorkflowDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) {
        await listener(event);
      }
    }
  }
}
