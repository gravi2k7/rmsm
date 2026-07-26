import type { Clock, IdGenerator } from "@rmsm/core";
import { unwrap } from "@rmsm/core";
import { SymbolCode } from "@rmsm/market";
import { Portfolio, Position, Trade, type PortfolioCalculator } from "@rmsm/portfolio";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { PortfolioIntelligenceDomainEvent } from "../../events/portfolio-intelligence-domain-events.interface";

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
  public readonly published: PortfolioIntelligenceDomainEvent[] = [];
  async publish(events: readonly PortfolioIntelligenceDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

/** A real, deterministic `PortfolioCalculator` for feeding
 * `@rmsm/portfolio`'s own unmodified `RiskMonitorService` in tests — a
 * fixed symbol->price map, no live network call. */
export class FakePortfolioCalculator implements PortfolioCalculator {
  constructor(private readonly prices: ReadonlyMap<string, number>) {}
  async getCurrentPrice(symbolCode: SymbolCode): Promise<number> {
    return this.prices.get(symbolCode.value) ?? 1;
  }
}

export function buildSymbolCode(value = "EURUSD"): SymbolCode {
  return unwrap(SymbolCode.create(value));
}

/** Builds a real, unmodified `@rmsm/portfolio` `Portfolio` aggregate
 * with the given open positions, via its own `Portfolio.create()` +
 * `Position.open()` + `Portfolio.openPosition()` — never a hand-rolled
 * test double. */
export function buildPortfolio(
  id: string,
  initialCashBalance: number,
  openPositions: readonly { symbolCode: string; side: "LONG" | "SHORT"; quantityUnits: number; averageEntryPrice: number; marginRequired: number }[] = [],
): Portfolio {
  const portfolio = Portfolio.create(id, initialCashBalance, new Date("2026-01-01T00:00:00.000Z"));
  for (const [index, spec] of openPositions.entries()) {
    const position = Position.open(`${id}-pos-${index}`, {
      symbolCode: buildSymbolCode(spec.symbolCode),
      side: spec.side,
      quantityUnits: spec.quantityUnits,
      averageEntryPrice: spec.averageEntryPrice,
      openedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    portfolio.openPosition(position, spec.marginRequired, new Date("2026-01-01T00:00:00.000Z"));
  }
  return portfolio;
}

/** Builds a real, unmodified `@rmsm/portfolio` `Trade` via
 * `Trade.fromClosedPosition()`, closing a fresh `Position` first. */
export function buildTrade(id: string, symbolCode: string, side: "LONG" | "SHORT", entryPrice: number, exitPrice: number, quantityUnits = 1000): Trade {
  const position = Position.open(`${id}-pos`, {
    symbolCode: buildSymbolCode(symbolCode),
    side,
    quantityUnits,
    averageEntryPrice: entryPrice,
    openedAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  position.close(exitPrice, new Date("2026-01-01T01:00:00.000Z"));
  return Trade.fromClosedPosition(id, position);
}
