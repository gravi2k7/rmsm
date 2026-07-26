import type { Clock, IdGenerator } from "@rmsm/core";
import { unwrap } from "@rmsm/core";
import { Timeframe, SymbolCode, Candle, Price, Volume } from "@rmsm/market";
import { StrategyFactory, StrategyVersion, StrategyRule, StrategyParameter, type Strategy, type RiskTolerance } from "@rmsm/strategy";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { StrategyIntelligenceDomainEvent } from "../../events/strategy-intelligence-domain-events.interface";

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
  public readonly published: StrategyIntelligenceDomainEvent[] = [];
  async publish(events: readonly StrategyIntelligenceDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

export function buildSymbolCode(value = "EURUSD"): SymbolCode {
  return unwrap(SymbolCode.create(value));
}

export interface BuildStrategyOptions {
  readonly name?: string;
  readonly riskTolerance?: RiskTolerance;
  readonly maxRiskPerTrade?: number;
  readonly maxLeverage?: number;
  readonly maxOpenPositions?: number;
  readonly supportedSymbols?: readonly string[];
  /** Number of enabled entry rules to attach via a fresh version. `0` leaves the strategy version-less. */
  readonly entryRuleCount?: number;
  readonly exitRuleCount?: number;
  readonly status?: "DRAFT" | "TESTING" | "PAPER_TRADING" | "PRODUCTION" | "ARCHIVED";
}

/** Builds a real, unmodified `@rmsm/strategy` `Strategy` aggregate via
 * its own `StrategyFactory` — never a hand-rolled test double standing
 * in for the real domain entity. */
export function buildStrategy(options: BuildStrategyOptions = {}): Strategy {
  const result = StrategyFactory.create({
    name: options.name ?? "Trend Follower",
    description: "A test fixture strategy.",
    riskTolerance: options.riskTolerance ?? "MEDIUM",
    maxRiskPerTrade: options.maxRiskPerTrade ?? 0.02,
    maxLeverage: options.maxLeverage ?? 3,
    maxOpenPositions: options.maxOpenPositions ?? 5,
    timeframe: Timeframe.H1,
    supportedSymbols: options.supportedSymbols ?? ["EURUSD"],
  });
  const strategy = unwrap(result);

  const entryRuleCount = options.entryRuleCount ?? 1;
  const exitRuleCount = options.exitRuleCount ?? 1;

  if (entryRuleCount > 0 || exitRuleCount > 0) {
    const rules: StrategyRule[] = [];
    for (let i = 0; i < entryRuleCount; i++) {
      rules.push(StrategyRule.create(`entry-${i}`, { kind: "ENTRY", description: `Entry condition ${i + 1}`, expression: `entry_${i} > 0`, order: i }));
    }
    for (let i = 0; i < exitRuleCount; i++) {
      rules.push(StrategyRule.create(`exit-${i}`, { kind: "EXIT", description: `Exit condition ${i + 1}`, expression: `exit_${i} > 0`, order: i }));
    }
    const version = StrategyVersion.create("version-1", { versionNumber: 1, rules, parameters: [] as StrategyParameter[], createdAt: new Date("2026-01-01") });
    strategy.addVersion(version);
  }

  if (options.status && options.status !== "DRAFT") {
    const path: Record<string, readonly string[]> = {
      TESTING: ["TESTING"],
      PAPER_TRADING: ["TESTING", "PAPER_TRADING"],
      PRODUCTION: ["TESTING", "PAPER_TRADING", "PRODUCTION"],
      ARCHIVED: ["ARCHIVED"],
    };
    for (const step of path[options.status] ?? []) {
      strategy.transitionTo(step as never);
    }
  }

  return strategy;
}

function price(amount: number): Price {
  return unwrap(Price.create(amount, 5));
}

function volume(units: number): Volume {
  return unwrap(Volume.create(units));
}

/** Builds a deterministic candle series for feeding REAL
 * `@rmsm/ai-market-intelligence` (AI-601) analysis services — this
 * package never computes volatility/regime itself, only consumes it,
 * so its own test fixtures need real candles too. */
export function buildCandles(closes: readonly number[], volumes?: readonly number[], symbolCode: SymbolCode = buildSymbolCode()): Candle[] {
  return closes.map((close, index) => {
    const open = index === 0 ? close : closes[index - 1]!;
    const high = Math.max(open, close) + 0.0005;
    const low = Math.min(open, close) - 0.0005;
    const timestamp = new Date(Date.UTC(2026, 0, 1, 0, index));
    return Candle.hydrate(`candle-${index}`, symbolCode, Timeframe.M1, timestamp, price(open), price(high), price(low), price(close), volume(volumes?.[index] ?? 1000));
  });
}
