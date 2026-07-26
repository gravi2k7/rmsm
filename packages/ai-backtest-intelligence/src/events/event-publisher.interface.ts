import type { BacktestIntelligenceDomainEvent } from "./backtest-intelligence-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly BacktestIntelligenceDomainEvent[]): Promise<void>;
}
