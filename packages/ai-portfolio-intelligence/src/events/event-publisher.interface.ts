import type { PortfolioIntelligenceDomainEvent } from "./portfolio-intelligence-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly PortfolioIntelligenceDomainEvent[]): Promise<void>;
}
