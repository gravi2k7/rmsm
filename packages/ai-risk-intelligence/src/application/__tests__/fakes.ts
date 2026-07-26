import type { Clock, IdGenerator } from "@rmsm/core";
import { unwrap } from "@rmsm/core";
import { SymbolCode } from "@rmsm/market";
import { RiskAssessment, RiskScore, type RiskChecks, type RiskCheckResult } from "@rmsm/decision";
import { Portfolio, Position, Trade } from "@rmsm/portfolio";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { RiskIntelligenceDomainEvent } from "../../events/risk-intelligence-domain-events.interface";

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
  public readonly published: RiskIntelligenceDomainEvent[] = [];
  async publish(events: readonly RiskIntelligenceDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

export function buildSymbolCode(value = "EURUSD"): SymbolCode {
  return unwrap(SymbolCode.create(value));
}

const PASS: RiskCheckResult = { passed: true };

/** Builds a real, unmodified `@rmsm/decision` `RiskAssessment` via its
 * own `RiskAssessment.create()` — never a hand-rolled test double. */
export function buildRiskAssessment(overallScore: number, failing: readonly (keyof RiskChecks)[] = []): RiskAssessment {
  const checks: RiskChecks = {
    maxDailyLoss: failing.includes("maxDailyLoss") ? { passed: false, message: "Max daily loss exceeded." } : PASS,
    maxPositionSize: failing.includes("maxPositionSize") ? { passed: false, message: "Max position size exceeded." } : PASS,
    exposureLimits: failing.includes("exposureLimits") ? { passed: false, message: "Exposure limit exceeded." } : PASS,
    correlationCheck: failing.includes("correlationCheck") ? { passed: false, message: "Correlation too high." } : PASS,
    marginCheck: failing.includes("marginCheck") ? { passed: false, message: "Insufficient margin." } : PASS,
  };
  return RiskAssessment.create("assessment-1", { checks, overallScore: unwrap(RiskScore.create(overallScore)), assessedAt: new Date("2026-01-01T00:00:00.000Z") });
}

/** Builds a real, unmodified `@rmsm/portfolio` `Portfolio`, optionally
 * with a starting `peakEquity` above `initialCashBalance` (simulated via
 * a deposit followed by `checkDrawdown` against a lower value, since
 * `Portfolio` exposes no direct peak-equity setter — exactly the kind of
 * real-lifecycle sequencing this domain's own aggregate enforces). */
export function buildPortfolioWithPeak(id: string, initialCashBalance: number, peakEquity: number): Portfolio {
  const portfolio = Portfolio.create(id, initialCashBalance, new Date("2026-01-01T00:00:00.000Z"));
  if (peakEquity > initialCashBalance) {
    portfolio.checkDrawdown(peakEquity, 100, new Date("2026-01-01T00:00:00.000Z"));
  }
  return portfolio;
}

export function buildPosition(id: string, symbolCode: string, side: "LONG" | "SHORT", quantityUnits: number, averageEntryPrice: number): Position {
  return Position.open(id, { symbolCode: buildSymbolCode(symbolCode), side, quantityUnits, averageEntryPrice, openedAt: new Date("2026-01-01T00:00:00.000Z") });
}

export function buildTrade(id: string, symbolCode: string, side: "LONG" | "SHORT", entryPrice: number, exitPrice: number, quantityUnits = 1000): Trade {
  const position = buildPosition(`${id}-pos`, symbolCode, side, quantityUnits, entryPrice);
  position.close(exitPrice, new Date("2026-01-01T01:00:00.000Z"));
  return Trade.fromClosedPosition(id, position);
}
