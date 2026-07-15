import type { IndicatorDefinition } from "./indicator-definition.interface";
import type { ExecutionContext } from "./execution-context.interface";
import type { IndicatorResult } from "./indicator-result.interface";

/**
 * The one interface every indicator implements — built-in (EMA, RSI,
 * MACD...), proprietary (RDSE, Market State Engine, BOS, CHOCH...), and
 * composite alike, per this module's own standing rule: "the engine
 * must treat proprietary indicators exactly like built-in indicators."
 * There is no separate `ProprietaryIndicator` or `CompositeIndicator`
 * interface — a composite indicator's `definition.dependencies` naming
 * other indicators (e.g. MACD depending on two EMAs) is the entire
 * mechanism that makes it "composite"; it needs no different shape than
 * a leaf indicator with no dependencies.
 *
 * `calculate`'s parameter type changed this phase: `IndicatorContext`
 * (Phase 1) → `ExecutionContext` (Phase 2B, item 2) — a genuine,
 * flagged restructuring (`execution-context.interface.ts`'s own header
 * comment has the full reasoning), not a rename for its own sake.
 * `calculate` remains deterministic and side-effect-free by
 * construction — its only input is `ExecutionContext` (already-resolved
 * candles and dependency results, never a live AI-101 connection) and
 * its only output is a plain `IndicatorResult`, mirroring the exact
 * normalizer/validator purity discipline AI-101's own Phase 2C
 * established ("no side effects, no database access, no network
 * access... given the same input, always produces the same output").
 */
export interface Indicator {
  readonly definition: IndicatorDefinition;
  calculate(context: ExecutionContext): IndicatorResult;
}
