import type { StrategyParameterValue } from "../value-objects/strategy-parameter.value-object";

/**
 * One named configuration of a `StrategyVersion`'s own tunable
 * `StrategyParameterDefinition`s — "Conservative" (risk_percent: 1%)
 * vs. "Aggressive" (risk_percent: 5%) as two `ExecutionProfile`s
 * against the SAME strategy version, exactly the mechanism named in
 * this milestone's own "Execution Profiles" responsibility. Mirrors
 * AI-102's own `IndicatorInstance` relationship to `IndicatorDefinition`
 * closely — a definition (here, `StrategyVersion`) is the immutable
 * template; a profile (here, the runtime configuration) is what an
 * actual execution/backtest (AI-106, a future module) would run
 * against. Deliberately a real, mutable entity (parameters CAN be
 * edited on an existing profile — a real, common need, "tweak my
 * Conservative profile's stop-loss slightly"), unlike `StrategyVersion`
 * itself, which is immutable once published.
 */
export class ExecutionProfile {
  constructor(
    public readonly id: string,
    public readonly strategyVersionId: string,
    public name: string,
    public parameters: Record<string, StrategyParameterValue>,
  ) {}

  updateParameters(overrides: Partial<Record<string, StrategyParameterValue>>): void {
    const merged: Record<string, StrategyParameterValue> = { ...this.parameters };
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== undefined) merged[key] = value;
    }
    this.parameters = merged;
  }
}
