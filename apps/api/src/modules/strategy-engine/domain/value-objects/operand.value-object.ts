/**
 * What a `Condition` (below) actually compares — a discriminated union
 * covering every real source a strategy rule needs to reference. This
 * is the genuine integration point with AI-102: an `IndicatorOperand`
 * names an indicator by identifier + version + parameters (the exact
 * shape AI-102's own `ExecuteIndicatorRequest`, Phase 3-4, already
 * takes) and an output series name (an indicator like MACD produces
 * multiple named series — "macd" vs "signal" vs "histogram", AI-102's
 * own `IndicatorOutputSpec.name`) — never a raw calculation AI-103
 * performs itself. Per this project's own "AI-103 consumes AI-102
 * services/contracts only" rule, resolving an `IndicatorOperand` to an
 * actual value is entirely AI-102's job (via `IndicatorEngineService`,
 * AI-102 Phase 3's own single public entry point) — this value object
 * only describes WHICH indicator output a condition wants, never how
 * to compute it.
 */

export interface IndicatorOperand {
  kind: "indicator";
  indicatorIdentifier: string;
  /** Omitted = latest registered version, the same default AI-102's own lookups use throughout. */
  indicatorVersion?: string;
  parameters: Record<string, number | string | boolean>;
  /** Which of the indicator's own named output series this operand reads — e.g. MACD's "signal" line specifically, not its "macd" or "histogram" series. */
  outputSeries: string;
}

/** A raw OHLCV field from the underlying candle itself — no indicator involved, e.g. "close > sma_20" needs "close" as a raw-field operand on one side. */
export interface MarketFieldOperand {
  kind: "market_field";
  field: "open" | "high" | "low" | "close" | "volume";
}

/** A fixed constant — e.g. "rsi < 30". A Decimal-precision STRING, never a JS number, the same no-floating-point-loss discipline every price-adjacent value in this platform has followed since AI-101's own Phase 2C normalizers. */
export interface ConstantOperand {
  kind: "constant";
  value: string;
}

export type Operand = IndicatorOperand | MarketFieldOperand | ConstantOperand;
