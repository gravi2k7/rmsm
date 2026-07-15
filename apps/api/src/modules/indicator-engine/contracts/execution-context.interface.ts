import type { MarketCandleModel } from "../../market-data/interfaces/models/time-series.models";
import type { IndicatorDefinition } from "./indicator-definition.interface";
import type { IndicatorInstance } from "./indicator-instance.interface";
import type { IndicatorResult } from "./indicator-result.interface";
import type { IndicatorTimeframe } from "./timeframe";
import type { CalculationWindow } from "./calculation-window.interface";
import type { ParameterValue } from "./parameter-definition.interface";

/**
 * Phase 2B's own item 2, replacing Phase 1's leaner `IndicatorContext`
 * (which had `instrumentId`/`timeframe`/`parameters`/`candles`/
 * `dependencyResults` only) — a genuine, flagged restructuring, the
 * same category of change as Phase 2A's `IndicatorMetadata` split. Every
 * field item 2 names, directly: execution id, indicator instance,
 * indicator definition, market data reference, timeframe, parameters,
 * calculation window, execution timestamp, metadata.
 *
 * **Immutable** (this phase's own explicit architecture rule) —
 * `Object.freeze()`-d by `ComputationEngine` before an indicator's
 * `calculate()` ever sees it, the identical enforcement discipline
 * Phase 2A's `IndicatorRegistryService` established for
 * `IndicatorDefinition`, applied here to the per-execution context
 * instead.
 *
 * **"Every indicator must receive ONLY this context object. No long
 * parameter lists."** — `Indicator.calculate(context: ExecutionContext)`
 * is still the entire signature (updated this phase from
 * `calculate(context: IndicatorContext)`); an indicator implementation
 * has no other input to reach for.
 */
export interface ExecutionContext {
  executionId: string;
  indicatorInstance: IndicatorInstance;
  indicatorDefinition: IndicatorDefinition;
  /**
   * "Market data reference" (item 2's own wording) — resolved to the
   * actual candle array here, not just an instrument id a caller would
   * have to re-fetch. An indicator receiving only an id would need its
   * own path back into AI-101 to turn that id into usable data,
   * violating "provider-independent, market-independent" (Phase 1's
   * Core Principles) and this module's own standing rule that an
   * indicator's calculation code never calls out to AI-101 directly.
   * Carries forward Phase 1's `IndicatorContext.candles` field
   * unchanged in shape (AI-101's own `MarketCandleModel`, ADR-025) —
   * only the containing object was restructured, not this field itself.
   */
  marketDataReference: {
    instrumentId: string;
    candles: MarketCandleModel[];
  };
  timeframe: IndicatorTimeframe;
  parameters: Record<string, ParameterValue>;
  calculationWindow: CalculationWindow;
  executionTimestamp: Date;
  /** Free-form, engine-populated metadata (e.g. which registry version resolved this execution, correlation ids) — deliberately not itemized further this phase, since item 2 names "metadata" without enumerating its own fields; a real Phase 2C+ need can extend this without another restructuring. */
  metadata: Record<string, unknown>;
  /** Results from every indicator this one's `IndicatorDefinition.dependencies` names, already computed — carried forward from Phase 1's `IndicatorContext.dependencyResults` unchanged. Resolution/ordering remains Phase 2C's job (dependency graph EXECUTION, explicitly out of this phase's scope) — this phase only carries the field forward on the context shape, it does not populate it for real yet (an indicator with dependencies cannot actually execute correctly until Phase 2C exists, a real, named limitation of this phase's own engine). */
  dependencyResults: Record<string, IndicatorResult>;
}
