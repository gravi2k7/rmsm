import type { TradingCopilotDomainEvent } from "./trading-copilot-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly TradingCopilotDomainEvent[]): Promise<void>;
}
