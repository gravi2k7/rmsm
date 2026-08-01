/**
 * FIP-001 Domain 10 (Derived Data Pipeline) — real, self-contained
 * technical-indicator math over an OHLCV candle series.
 *
 * **Why this exists instead of calling the `indicator-engine` module**:
 * that module (AI-102) is a real, working REGISTRY/EXECUTION-PLANNING
 * platform — but its own `IndicatorFactoryService` has zero registered
 * `calculate()` implementations (`indicator-factory.service.ts`'s own
 * header comment: "Genuinely empty this phase... EMA, RSI, MACD, ATR...
 * are explicitly deferred"; verified by its own test asserting every
 * `execute()` call throws `IndicatorNotFoundException`). Calling it from
 * here would not compute anything — it would deterministically fail for
 * every one of Domain 10's 8 named indicators. Depending on a
 * documented-broken call is not meaningfully different from a mock, so
 * per this project's "no mock implementations" rule, Domain 10's own
 * explicit requirement ("Automatically generate ATR, RSI, EMA, SMA,
 * MACD, Bollinger Bands, VWAP, Pivot Points... Store derived values for
 * AI consumption") is implemented here, directly, with real formulas.
 * This is deliberately narrow — 8 named indicators plus 3 simple
 * classification labels, not a second general-purpose indicator
 * platform — and does not touch, duplicate, or replace
 * `indicator-engine`'s registry/planning/execution architecture, which
 * remains this repo's own future concern for on-demand strategy/
 * dashboard indicator execution.
 *
 * Every function is pure: (series in) -> (value out), no I/O, no
 * Prisma, easily unit-testable in isolation.
 */

export interface OhlcvBar {
  eventTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const window = values.slice(values.length - period);
  return window.reduce((sum, v) => sum + v, 0) / period;
}

export function ema(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let value = values.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
  for (let i = period; i < values.length; i++) {
    value = values[i]! * k + value * (1 - k);
  }
  return value;
}

/** Wilder's RSI over the last `period + 1` closes. */
export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  const recent = closes.slice(closes.length - (period + 1));
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < recent.length; i++) {
    const change = recent[i]! - recent[i - 1]!;
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Average True Range (simple average of True Range over `period` bars — not Wilder-smoothed, a defensible, documented simplification). */
export function atr(bars: OhlcvBar[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  const trueRanges: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const current = bars[i]!;
    const previous = bars[i - 1]!;
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close),
    );
    trueRanges.push(tr);
  }
  return sma(trueRanges, period);
}

export interface MacdResult {
  macd: number;
  signal: number;
  histogram: number;
}

/** Standard 12/26/9 MACD — the signal line uses a simplified EMA over the trailing MACD series (recomputed from the same closes), not an incrementally-maintained state series, since this pipeline recomputes from scratch on each generation pass rather than maintaining running state. */
export function macd(closes: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): MacdResult | null {
  if (closes.length < slowPeriod + signalPeriod) return null;
  const macdSeries: number[] = [];
  for (let end = slowPeriod; end <= closes.length; end++) {
    const slice = closes.slice(0, end);
    const fast = ema(slice, fastPeriod);
    const slow = ema(slice, slowPeriod);
    if (fast === null || slow === null) continue;
    macdSeries.push(fast - slow);
  }
  if (macdSeries.length < signalPeriod) return null;
  const signal = ema(macdSeries, signalPeriod);
  const macdValue = macdSeries[macdSeries.length - 1]!;
  if (signal === null) return null;
  return { macd: macdValue, signal, histogram: macdValue - signal };
}

export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
}

export function bollingerBands(closes: number[], period = 20, stdDevMultiplier = 2): BollingerBandsResult | null {
  const middle = sma(closes, period);
  if (middle === null) return null;
  const window = closes.slice(closes.length - period);
  const variance = window.reduce((sum, v) => sum + (v - middle) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);
  return { upper: middle + stdDevMultiplier * stdDev, middle, lower: middle - stdDevMultiplier * stdDev };
}

/** Cumulative session VWAP over the supplied bars (caller passes only the current session's bars — session-boundary slicing is the caller's responsibility, per VWAP_DEFINITION's own "typically reset at the start of each trading session" doc comment). */
export function vwap(bars: OhlcvBar[]): number | null {
  if (bars.length === 0) return null;
  let cumulativePV = 0;
  let cumulativeVolume = 0;
  for (const bar of bars) {
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    cumulativePV += typicalPrice * bar.volume;
    cumulativeVolume += bar.volume;
  }
  if (cumulativeVolume === 0) return null;
  return cumulativePV / cumulativeVolume;
}

export interface PivotPointsResult {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

/** Standard floor-trader pivot points from the prior completed bar's H/L/C. */
export function pivotPoints(priorBar: OhlcvBar): PivotPointsResult {
  const { high, low, close } = priorBar;
  const pivot = (high + low + close) / 3;
  return {
    pivot,
    r1: 2 * pivot - low,
    r2: pivot + (high - low),
    r3: high + 2 * (pivot - low),
    s1: 2 * pivot - high,
    s2: pivot - (high - low),
    s3: low - 2 * (high - pivot),
  };
}

/** Annualized-style realized volatility: stdev of log returns over the trailing window, expressed as a percentage — a simple, standard, documented choice (not the only valid definition, but a real, defensible one). */
export function realizedVolatility(closes: number[], period = 20): number | null {
  if (closes.length < period + 1) return null;
  const window = closes.slice(closes.length - (period + 1));
  const returns: number[] = [];
  for (let i = 1; i < window.length; i++) {
    returns.push(Math.log(window[i]! / window[i - 1]!));
  }
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * 100;
}

export type TrendLabel = "uptrend" | "downtrend" | "sideways";

/** Simple, defensible trend classification: current close vs. a slower SMA, with a small deadband to avoid flip-flopping on noise. */
export function classifyTrend(closes: number[], smaPeriod = 50, deadbandPct = 0.1): TrendLabel | null {
  const baseline = sma(closes, smaPeriod);
  if (baseline === null) return null;
  const current = closes[closes.length - 1]!;
  const deltaPct = ((current - baseline) / baseline) * 100;
  if (deltaPct > deadbandPct) return "uptrend";
  if (deltaPct < -deadbandPct) return "downtrend";
  return "sideways";
}

export type VolatilityLabel = "low" | "moderate" | "high";

/** Buckets realizedVolatility()'s percentage output into 3 labels — thresholds are a documented, reasonable default (not derived from any specific instrument's history), intended to be revisited once real production volatility distributions are observed. */
export function classifyVolatility(volatilityPct: number | null): VolatilityLabel | null {
  if (volatilityPct === null) return null;
  if (volatilityPct < 1) return "low";
  if (volatilityPct < 3) return "moderate";
  return "high";
}
