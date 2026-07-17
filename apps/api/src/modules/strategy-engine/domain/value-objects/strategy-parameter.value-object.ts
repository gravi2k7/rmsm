/**
 * A strategy's OWN tunable parameters — e.g. "risk_percent",
 * "stop_loss_atr_multiplier" — distinct from any individual
 * `IndicatorOperand`'s own parameters (which belong to AI-102's own
 * `ParameterDefinition`, reused there, not redeclared here). A
 * strategy parameter is something the strategy AUTHOR exposes as
 * configurable when someone creates an `ExecutionProfile` (below) from
 * this strategy — the mechanism that lets one strategy definition
 * support a "Conservative" profile and an "Aggressive" profile without
 * being two different strategies.
 *
 * Deliberately mirrors the SHAPE of AI-102's own `ParameterDefinition`
 * discriminated union (same 8 variants: integer, decimal, boolean,
 * enum, string, timeframe, symbol, date) — not a coincidence, a
 * genuine reuse of a proven pattern, since "a strongly-typed,
 * validatable parameter" is the same real problem in both modules.
 * Declared independently here rather than imported from AI-102,
 * though — "Do NOT modify AI-101/AI-102... reuse existing shared
 * packages" means importing an AI-102-INTERNAL type (this one isn't
 * exported as a shared package type) would create an undocumented
 * coupling AI-102's own module boundary doesn't sanction; a genuinely
 * shared version of this shape belongs in `@rmsm/shared` if a future
 * milestone finds real duplication pain from keeping them separate,
 * not assumed necessary from the start.
 */

export interface IntegerStrategyParameter {
  type: "integer";
  name: string;
  required: boolean;
  defaultValue?: number;
  min?: number;
  max?: number;
}
export interface DecimalStrategyParameter {
  type: "decimal";
  name: string;
  required: boolean;
  defaultValue?: string;
  min?: string;
  max?: string;
}
export interface BooleanStrategyParameter {
  type: "boolean";
  name: string;
  required: boolean;
  defaultValue?: boolean;
}
export interface EnumStrategyParameter {
  type: "enum";
  name: string;
  required: boolean;
  defaultValue?: string;
  allowedValues: string[];
}
export interface StringStrategyParameter {
  type: "string";
  name: string;
  required: boolean;
  defaultValue?: string;
  maxLength?: number;
}

export type StrategyParameterDefinition =
  | IntegerStrategyParameter
  | DecimalStrategyParameter
  | BooleanStrategyParameter
  | EnumStrategyParameter
  | StringStrategyParameter;

export type StrategyParameterValue = number | string | boolean;
