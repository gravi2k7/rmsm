import type { ParameterValue } from "./parameter-definition.interface";

/**
 * The mutable runtime counterpart to `IndicatorDefinition`'s immutable
 * template — this phase's own explicit architectural improvement
 * request, quoted directly: "Indicator Definition → 'EMA version
 * 1.0.0' (never changes at runtime). Indicator Instance → 'EMA(period=20,
 * source=close)' (runtime configuration)."
 *
 * One `IndicatorDefinition` (e.g. "ema") can have many `IndicatorInstance`s
 * (EMA(20), EMA(50), EMA(200) — this phase's own worked example), each
 * with its own `instanceId` and its own parameter overrides layered on
 * top of the definition's `defaultParameters`. The definition itself
 * never changes when an instance's parameters are updated — only the
 * instance does. See `registry/indicator-instance.ts` for the real,
 * mutable implementation of this interface (Phase 2A builds a real
 * class here, not just a contract, per this phase's own scope —
 * unlike Phase 1, which was contracts-only throughout).
 */
export interface IndicatorInstance {
  readonly instanceId: string;
  readonly definitionIdentifier: string;
  /** Pinned at creation time — an instance always calculates against the specific definition version it was created from, even if a newer version is later registered (item 7's multi-version coexistence, applied at the instance level: upgrading an instance to a new definition version is an explicit, separate action, never an implicit side effect of the registry gaining a new version). */
  readonly definitionVersion: string;
  /** Mutable — the one field this interface's methods actually change. Starts as a copy of the definition's `defaultParameters`, then diverges via `updateParameters`. */
  readonly parameters: Readonly<Record<string, ParameterValue>>;
  /** Merges the given overrides into `parameters` — a partial update (only the named parameters change; anything not named keeps its current value), not a full replacement. */
  updateParameters(overrides: Partial<Record<string, ParameterValue>>): void;
}
