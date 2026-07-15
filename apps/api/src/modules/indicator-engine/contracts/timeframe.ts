import type { CandleInterval } from "@rmsm/database";

/**
 * AI-102's timeframe concept is AI-101's `CandleInterval` — reused
 * directly, not redeclared, per this project's own established
 * precedent (AI-101 itself reused `@rmsm/database` enums in its Phase
 * 2A domain models rather than duplicating them, ADR-025's reasoning
 * applies equally here) and per this phase's own architecture rule:
 * "indicators consume canonical AI-101 market data only" — a timeframe
 * AI-101 doesn't have is not a timeframe AI-102 can compute anything
 * real against.
 *
 * **A genuine gap, flagged rather than silently glossed over**: this
 * phase's own multi-timeframe list (item 8) names 1m, 2m, 3m, 4m, 5m,
 * 15m, 30m, 1H, 4H, 1D, 1W, Monthly. AI-101's `CandleInterval` has
 * `ONE_MINUTE`, `FIVE_MINUTES`, `FIFTEEN_MINUTES`, `THIRTY_MINUTES`,
 * `ONE_HOUR`, `FOUR_HOURS`, `ONE_DAY`, `ONE_WEEK`, `ONE_MONTH` —
 * **no 2-, 3-, or 4-minute interval exists anywhere in AI-101**. AI-102
 * cannot support those three timeframes today, full stop; there is no
 * canonical data to compute them from, and per "no module may bypass
 * AI-101" (this phase's own architecture rule), AI-102 has no
 * legitimate way to source that data itself.
 *
 * Two paths exist for closing this gap, neither implemented this
 * phase (architecture only): (a) AI-101 gains new `CandleInterval`
 * values in a future phase — the more correct fix, since 2m/3m/4m
 * candles are then real, storable, correctable data, not derived
 * approximations; or (b) AI-102 gains a synthetic-timeframe
 * aggregation capability (e.g., building a 3m candle from three
 * persisted 1m candles on the fly) — plausible, but means those
 * "candles" are never stored, never corrected, and technically owned
 * by AI-102 rather than AI-101, a real tension with "AI-101 is the
 * single source of truth for all market data." Recorded as an open
 * question for Phase 2, not decided here.
 */
export type IndicatorTimeframe = CandleInterval;

/** The 12 timeframes this phase's own spec named, annotated with which are and aren't currently computable — documentation, not a type declaration (a type can't express "computable today" vs "not yet"). */
export const REQUESTED_TIMEFRAMES_STATUS: Record<string, { supported: boolean; candleInterval: IndicatorTimeframe | null }> = {
  "1m": { supported: true, candleInterval: "ONE_MINUTE" },
  "2m": { supported: false, candleInterval: null },
  "3m": { supported: false, candleInterval: null },
  "4m": { supported: false, candleInterval: null },
  "5m": { supported: true, candleInterval: "FIVE_MINUTES" },
  "15m": { supported: true, candleInterval: "FIFTEEN_MINUTES" },
  "30m": { supported: true, candleInterval: "THIRTY_MINUTES" },
  "1H": { supported: true, candleInterval: "ONE_HOUR" },
  "4H": { supported: true, candleInterval: "FOUR_HOURS" },
  "1D": { supported: true, candleInterval: "ONE_DAY" },
  "1W": { supported: true, candleInterval: "ONE_WEEK" },
  Monthly: { supported: true, candleInterval: "ONE_MONTH" },
};
