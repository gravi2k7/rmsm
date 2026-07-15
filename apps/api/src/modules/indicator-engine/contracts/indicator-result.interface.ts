import type { IndicatorTimeframe } from "./timeframe";

/**
 * One computed value at one point in time, for one named output series
 * (IndicatorOutputSpec.name — e.g. MACD's "macd" vs "signal" vs
 * "histogram" are three separate series of IndicatorResultPoint, not
 * one merged shape). Value is a `string`, never a `number` — the same
 * "no floating-point precision loss" discipline AI-101's own Decimal
 * normalizer established (ADR from AI-101 Phase 2C); an indicator
 * computed from AI-101's Decimal-string candle data must not silently
 * reintroduce float error by routing through a plain JS number for
 * storage/comparison.
 */
export interface IndicatorResultPoint {
  eventTime: Date;
  value: string;
}

/**
 * The full output of one indicator calculation — one or more named
 * series (IndicatorOutputSpec.name → its computed points), plus enough
 * lineage to know exactly what produced it: which indicator, which
 * version, against which instrument/timeframe/parameter set. A future
 * consumer (AI-103+) comparing two IndicatorResults needs this lineage
 * to know whether they're even comparable (same indicator version,
 * same parameters) — the same "preserve source lineage" principle
 * AI-101's own schema applied to market data, applied here to derived
 * indicator data.
 */
export interface IndicatorResult {
  indicatorIdentifier: string;
  indicatorVersion: string;
  instrumentId: string;
  timeframe: IndicatorTimeframe;
  /** The exact parameter values used for this calculation (e.g. { period: 14 }) — part of a result's identity, since the same indicator at two different parameter values is two different results, not a version difference. */
  parameters: Record<string, number | string | boolean>;
  /** Keyed by IndicatorOutputSpec.name. */
  series: Record<string, IndicatorResultPoint[]>;
  computedAt: Date;
}
