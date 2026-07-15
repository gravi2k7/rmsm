import type { IndicatorDefinition } from "./indicator-definition.interface";
import type { IndicatorContext } from "./indicator-context.interface";
import type { IndicatorResult } from "./indicator-result.interface";

/**
 * The one interface every indicator implements — built-in (EMA, RSI,
 * MACD...), proprietary (RDSE, Market State Engine, BOS, CHOCH...), and
 * composite alike, per this phase's own explicit rule: "the engine must
 * treat proprietary indicators exactly like built-in indicators." There
 * is no separate `ProprietaryIndicator` or `CompositeIndicator`
 * interface — a composite indicator's `definition.dependencies` naming
 * other indicators (e.g. MACD depending on two EMAs) is the entire
 * mechanism that makes it "composite"; it needs no different shape than
 * a leaf indicator with no dependencies. `definition` was `metadata` in
 * Phase 1 — renamed this phase alongside the `IndicatorMetadata` →
 * `IndicatorDefinition` restructuring (indicator-metadata.interface.ts's
 * own header comment has the full reasoning).
 *
 * `calculate` is deterministic and side-effect-free by construction —
 * its only input is `IndicatorContext` (already-resolved candles and
 * dependency results, never a live AI-101 connection) and its only
 * output is a plain `IndicatorResult`, mirroring the exact
 * normalizer/validator purity discipline AI-101's own Phase 2C
 * established ("no side effects, no database access, no network
 * access... given the same input, always produces the same output").
 */
export interface Indicator {
  readonly definition: IndicatorDefinition;
  calculate(context: IndicatorContext): IndicatorResult;
}
