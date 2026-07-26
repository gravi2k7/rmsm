import type { ExecutiveReportsDomainEvent } from "./executive-reports-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly ExecutiveReportsDomainEvent[]): Promise<void>;
}
