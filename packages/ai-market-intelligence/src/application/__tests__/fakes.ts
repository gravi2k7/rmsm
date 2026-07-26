import type { Clock, IdGenerator } from "@rmsm/core";
import { unwrap } from "@rmsm/core";
import { Candle, SymbolCode, Price, Volume, Timeframe } from "@rmsm/market";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { MarketIntelligenceDomainEvent } from "../../events/market-intelligence-domain-events.interface";

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
  public readonly published: MarketIntelligenceDomainEvent[] = [];
  async publish(events: readonly MarketIntelligenceDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

export function buildSymbolCode(value = "EURUSD"): SymbolCode {
  return unwrap(SymbolCode.create(value));
}

function price(amount: number): Price {
  return unwrap(Price.create(amount, 5));
}

function volume(units: number): Volume {
  return unwrap(Volume.create(units));
}

/** Builds a deterministic candle series: `closes[i]` is bar i's close;
 * open/high/low derive from it with a small, fixed spread so OHLC
 * invariants always hold. */
export function buildCandles(closes: readonly number[], volumes?: readonly number[], symbolCode: SymbolCode = buildSymbolCode()): Candle[] {
  return closes.map((close, index) => {
    const open = index === 0 ? close : closes[index - 1]!;
    const high = Math.max(open, close) + 0.0005;
    const low = Math.min(open, close) - 0.0005;
    const timestamp = new Date(Date.UTC(2026, 0, 1, 0, index));
    return Candle.hydrate(`candle-${index}`, symbolCode, Timeframe.M1, timestamp, price(open), price(high), price(low), price(close), volume(volumes?.[index] ?? 1000));
  });
}
