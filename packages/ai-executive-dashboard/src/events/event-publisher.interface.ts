import type { ExecutiveDashboardDomainEvent } from "./executive-dashboard-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly ExecutiveDashboardDomainEvent[]): Promise<void>;
}
