/**
 * Strongly typed indicator parameters (item 5) — a discriminated union
 * on `type`, replacing Phase 1's simpler `IndicatorInputSpec`
 * ("number" | "string" | "boolean" only). This is a genuine widening,
 * not a cosmetic rename: Phase 1 had no way to express "this parameter
 * must be one of AI-101's actual timeframes" or "this parameter is a
 * calendar date" as a real, checkable type — those are exactly what a
 * real EMA-period, RSI-source, or backtest-date-range parameter needs.
 * Each variant's `defaultValue` and validation-relevant fields are typed
 * to match its own `type`, so a real Phase 2A validator implementation
 * (`RegistryValidatorService`) can exhaustively switch on `type` with
 * TypeScript verifying every case is handled — the same exhaustiveness
 * benefit `IncrementalUpdateEvent`'s discriminated union (Phase 1)
 * already established for this module.
 */

export interface IntegerParameterDefinition {
  type: "integer";
  name: string;
  required: boolean;
  defaultValue?: number;
  min?: number;
  max?: number;
}

export interface DecimalParameterDefinition {
  type: "decimal";
  name: string;
  required: boolean;
  /** String, never a JS number — the same no-floating-point-loss discipline AI-101's own Decimal normalizer established, applied here since a decimal parameter (e.g. a multiplier like Bollinger Bands' "2.0" standard-deviation factor) deserves the identical precision guarantee as a price. */
  defaultValue?: string;
  min?: string;
  max?: string;
}

export interface BooleanParameterDefinition {
  type: "boolean";
  name: string;
  required: boolean;
  defaultValue?: boolean;
}

export interface EnumParameterDefinition {
  type: "enum";
  name: string;
  required: boolean;
  defaultValue?: string;
  /** The closed set of valid values — e.g. MACD's "source" parameter: ["open","high","low","close"]. */
  allowedValues: string[];
}

export interface StringParameterDefinition {
  type: "string";
  name: string;
  required: boolean;
  defaultValue?: string;
  maxLength?: number;
}

/** A parameter whose value must be one of AI-101's actual CandleInterval values — e.g. an indicator taking an explicit higher-timeframe parameter for its own multi-timeframe confluence check, distinct from the execution request's own top-level timeframe (contracts/indicator-execution.interface.ts). */
export interface TimeframeParameterDefinition {
  type: "timeframe";
  name: string;
  required: boolean;
  defaultValue?: import("./timeframe").IndicatorTimeframe;
}

/** A parameter referencing another instrument by id — e.g. a relative-strength indicator comparing its primary instrument against a named benchmark instrument. Deliberately `instrumentId` (a UUID, AI-101's own identifier), not a raw symbol string — resolving a symbol to an instrument is AI-101's `MarketDataService`'s job (ADR-028's reasoning: no guessed symbol-splitting), not something this parameter type re-implements. */
export interface SymbolParameterDefinition {
  type: "symbol";
  name: string;
  required: boolean;
  defaultValue?: string;
}

export interface DateParameterDefinition {
  type: "date";
  name: string;
  required: boolean;
  /** ISO 8601 string, matching every date-bearing DTO field in this project's established convention (AI-101's own request DTOs), never a Date object at the definition-metadata layer (metadata must stay a plain, serializable value — a Date object doesn't survive JSON round-tripping without special handling). */
  defaultValue?: string;
}

export type ParameterDefinition =
  | IntegerParameterDefinition
  | DecimalParameterDefinition
  | BooleanParameterDefinition
  | EnumParameterDefinition
  | StringParameterDefinition
  | TimeframeParameterDefinition
  | SymbolParameterDefinition
  | DateParameterDefinition;

/** The actual runtime value a ParameterDefinition resolves to once an IndicatorInstance provides it — the union of every variant's value type. */
export type ParameterValue = number | string | boolean;
