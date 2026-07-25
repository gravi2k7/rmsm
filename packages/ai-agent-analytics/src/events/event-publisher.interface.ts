import type { AgentAnalyticsDomainEvent } from "./agent-analytics-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly AgentAnalyticsDomainEvent[]): Promise<void>;
}
