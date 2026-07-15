import type { MarketCandleModel } from "../../market-data/interfaces/models/time-series.models";
import type { IndicatorResult } from "./indicator-result.interface";

/**
 * What an indicator's own calculation function actually receives —
 * deliberately NOT a live connection to AI-101's services or
 * repositories (an indicator implementation must stay
 * provider-independent and market-independent, this phase's own Core
 * Principles). The computation engine (Phase 2+) resolves everything an
 * indicator needs — candles, dependency results, parameters — and hands
 * it over as this one plain, already-resolved context object. An
 * indicator's calculation code never calls out to AI-101 itself; this
 * is the enforced seam that keeps "indicators consume canonical AI-101
 * market data only" true structurally, not just by convention.
 */
export interface IndicatorContext {
  instrumentId: string;
  timeframe: import("./timeframe").IndicatorTimeframe;
  parameters: Record<string, number | string | boolean>;
  /** Already resolved by the computation engine — ordered oldest-first, covering at least `requiredLookback` candles before the calculation's actual target range. Uses AI-101's own domain model directly (Phase 2A's `MarketCandleModel`, ADR-025) rather than a redeclared shape — the same string-Decimal, no-Prisma-object discipline applies here unchanged. */
  candles: MarketCandleModel[];
  /** Results from every indicator this one's `IndicatorMetadata.dependencies` names, already computed — resolved and ordered by the dependency graph (dependency-graph contracts) before this indicator's own calculation ever runs, so a dependent indicator's calculation code is never responsible for triggering its own dependencies. */
  dependencyResults: Record<string, IndicatorResult>;
}
