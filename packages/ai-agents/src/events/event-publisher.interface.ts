import type { AgentDomainEvent } from "./agent-domain-events.interface";

/** Same "application publishes, infrastructure delivers" split every
 * package in this platform uses — AI-204/AI-410 observe agent runs by
 * implementing this port, exactly the way `MemoryEventTracingAdapter`
 * observes `@rmsm/ai-memory`. */
export interface EventPublisher {
  publish(events: readonly AgentDomainEvent[]): Promise<void>;
}
