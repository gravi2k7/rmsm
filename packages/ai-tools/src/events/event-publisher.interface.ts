import type { ToolDomainEvent } from "./tool-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly ToolDomainEvent[]): Promise<void>;
}
