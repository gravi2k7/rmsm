import type { Clock, IdGenerator } from "@rmsm/core";
import { unwrap } from "@rmsm/core";
import { OpportunityFactory, type Opportunity, type SignalDirection, type Trend, type VolatilityLevel, type LiquidityLevel } from "@rmsm/opportunity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { SignalIntelligenceDomainEvent } from "../../events/signal-intelligence-domain-events.interface";

export class FixedClock implements Clock {
  constructor(private current: Date = new Date("2026-01-01T00:00:00.000Z")) {}
  now(): Date {
    return this.current;
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

export class RecordingEventPublisher implements EventPublisher {
  public readonly published: SignalIntelligenceDomainEvent[] = [];
  async publish(events: readonly SignalIntelligenceDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

export interface BuildOpportunityOptions {
  readonly id?: string;
  readonly symbolCode?: string;
  readonly strategyId?: string;
  readonly signalId?: string;
  readonly direction?: SignalDirection;
  readonly signalMagnitude?: number;
  readonly confidenceScore?: number;
  readonly trend?: Trend;
  readonly volatility?: VolatilityLevel;
  readonly liquidity?: LiquidityLevel;
  readonly createdAt?: Date;
  readonly expiresAt?: Date;
}

let sequence = 0;

/** Builds a real, unmodified `@rmsm/opportunity` `Opportunity` aggregate
 * via its own `OpportunityFactory` — never a hand-rolled test double. */
export function buildOpportunity(options: BuildOpportunityOptions = {}): Opportunity {
  sequence += 1;
  const createdAt = options.createdAt ?? new Date("2026-01-01T00:00:00.000Z");
  const expiresAt = options.expiresAt ?? new Date(createdAt.getTime() + 60 * 60 * 1000);

  const result = OpportunityFactory.create({
    id: options.id ?? `opportunity-${sequence}`,
    symbolCode: options.symbolCode ?? "EURUSD",
    strategyId: options.strategyId ?? "strategy-1",
    signalId: options.signalId ?? `signal-${sequence}`,
    direction: options.direction ?? "BUY",
    signalMagnitude: options.signalMagnitude ?? 0.8,
    confidenceScore: options.confidenceScore ?? 80,
    trend: options.trend ?? "UP",
    volatility: options.volatility ?? "LOW",
    liquidity: options.liquidity ?? "HIGH",
    createdAt,
    expiresAt,
  });

  return unwrap(result);
}
