import type { Clock, IdGenerator } from "@rmsm/core";
import { unwrap } from "@rmsm/core";
import { SymbolCode } from "@rmsm/market";
import { Position, Trade } from "@rmsm/portfolio";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { BacktestIntelligenceDomainEvent } from "../../events/backtest-intelligence-domain-events.interface";

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
  public readonly published: BacktestIntelligenceDomainEvent[] = [];
  async publish(events: readonly BacktestIntelligenceDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

export function buildSymbolCode(value = "EURUSD"): SymbolCode {
  return unwrap(SymbolCode.create(value));
}

/** Builds a real, unmodified `@rmsm/portfolio` `Trade` via
 * `Trade.fromClosedPosition()`, closing a fresh `Position` first —
 * never a hand-rolled test double standing in for the real domain
 * entity. */
export function buildTrade(id: string, entryPrice: number, exitPrice: number, closedAt: Date, quantityUnits = 1000): Trade {
  const position = Position.open(`${id}-pos`, {
    symbolCode: buildSymbolCode(),
    side: "LONG",
    quantityUnits,
    averageEntryPrice: entryPrice,
    openedAt: new Date(closedAt.getTime() - 60 * 60 * 1000),
  });
  position.close(exitPrice, closedAt);
  return Trade.fromClosedPosition(id, position);
}
