import type { Candle } from "@rmsm/market";
import { TrendDirection, VolatilityLevel, MarketStructure, LiquidityLevel, TradingSession } from "../../domain/enums/market-intelligence.enum";
import type { TrendAnalysis } from "../../domain/entities/trend-analysis.entity";
import type { MomentumAnalysis } from "../../domain/entities/momentum-analysis.entity";
import type { VolatilityAnalysis } from "../../domain/entities/volatility-analysis.entity";
import type { MarketStructureAnalysis } from "../../domain/entities/market-structure-analysis.entity";
import type { LiquidityAnalysis } from "../../domain/entities/liquidity-analysis.entity";
import type { SessionAnalysis } from "../../domain/entities/session-analysis.entity";
import { InsufficientCandlesError } from "../../domain/errors/market-intelligence-domain.errors";

/**
 * The base analysis capabilities — "trend analysis," "momentum
 * analysis," "volatility analysis," "market structure analysis,"
 * "liquidity analysis," and "session analysis" — all computed directly
 * from `@rmsm/market`'s own `Candle` aggregate (raw OHLCV), using
 * simple, transparent statistics (linear regression, standard
 * deviation, swing-point comparison). Deliberately NOT a re-
 * implementation of `apps/api`'s indicator-engine: no named indicator
 * (RSI/MACD/ATR/...) is computed anywhere in this class — those come
 * from a real engine through `IndicatorProvider` instead. Every method
 * here answers a narrower question: "what does the raw price/volume
 * series itself say," which is genuinely a different, lighter-weight
 * concern than a pluggable indicator computation platform.
 */
export class MarketAnalysisService {
  analyzeTrend(candles: readonly Candle[]): TrendAnalysis {
    this.assertMinimum(candles, 2);
    const closes = candles.map((c) => c.close.amount);
    const slope = this.linearRegressionSlope(closes);
    const averageClose = closes.reduce((sum, v) => sum + v, 0) / closes.length;
    const normalizedSlope = averageClose === 0 ? 0 : (slope * closes.length) / averageClose;
    const strength = Math.min(1, Math.abs(normalizedSlope) * 5);

    const direction = strength < 0.05 ? TrendDirection.SIDEWAYS : slope > 0 ? TrendDirection.UP : TrendDirection.DOWN;
    return { direction, strength, slopePerBar: slope };
  }

  analyzeMomentum(candles: readonly Candle[]): MomentumAnalysis {
    this.assertMinimum(candles, 2);
    const first = candles[0]!.close.amount;
    const last = candles[candles.length - 1]!.close.amount;
    const rateOfChange = first === 0 ? 0 : ((last - first) / first) * 100;

    const midpoint = Math.floor(candles.length / 2);
    const firstHalfChange = this.percentChange(candles.slice(0, midpoint + 1));
    const secondHalfChange = this.percentChange(candles.slice(midpoint));
    const accelerating = Math.abs(secondHalfChange) > Math.abs(firstHalfChange);

    return { rateOfChange, accelerating };
  }

  analyzeVolatility(candles: readonly Candle[]): VolatilityAnalysis {
    this.assertMinimum(candles, 2);
    const returns: number[] = [];
    for (let i = 1; i < candles.length; i += 1) {
      const previous = candles[i - 1]!.close.amount;
      const current = candles[i]!.close.amount;
      if (previous !== 0) {
        returns.push((current - previous) / previous);
      }
    }
    const mean = returns.reduce((sum, v) => sum + v, 0) / (returns.length || 1);
    const variance = returns.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (returns.length || 1);
    const stdDev = Math.sqrt(variance);

    let level: VolatilityLevel;
    if (stdDev < 0.001) level = VolatilityLevel.LOW;
    else if (stdDev < 0.005) level = VolatilityLevel.MODERATE;
    else if (stdDev < 0.02) level = VolatilityLevel.HIGH;
    else level = VolatilityLevel.EXTREME;

    return { level, returnStdDev: stdDev };
  }

  analyzeStructure(candles: readonly Candle[]): MarketStructureAnalysis {
    this.assertMinimum(candles, 4);
    const midpoint = Math.floor(candles.length / 2);
    const firstHalf = candles.slice(0, midpoint);
    const secondHalf = candles.slice(midpoint);

    const firstHigh = Math.max(...firstHalf.map((c) => c.high.amount));
    const secondHigh = Math.max(...secondHalf.map((c) => c.high.amount));
    const firstLow = Math.min(...firstHalf.map((c) => c.low.amount));
    const secondLow = Math.min(...secondHalf.map((c) => c.low.amount));

    const higherHighs = secondHigh > firstHigh;
    const higherLows = secondLow > firstLow;
    const lowerHighs = secondHigh < firstHigh;
    const lowerLows = secondLow < firstLow;

    const structure =
      higherHighs && higherLows ? MarketStructure.UPTREND : lowerHighs && lowerLows ? MarketStructure.DOWNTREND : MarketStructure.CONSOLIDATION;

    return { structure, higherHighs, higherLows, lowerHighs, lowerLows };
  }

  analyzeLiquidity(candles: readonly Candle[]): LiquidityAnalysis {
    this.assertMinimum(candles, 1);
    const averageVolumeUnits = candles.reduce((sum, c) => sum + c.volume.units, 0) / candles.length;

    let level: LiquidityLevel;
    if (averageVolumeUnits < 100) level = LiquidityLevel.LOW;
    else if (averageVolumeUnits < 10000) level = LiquidityLevel.MODERATE;
    else level = LiquidityLevel.HIGH;

    return { level, averageVolumeUnits };
  }

  analyzeSession(timestamp: Date): SessionAnalysis {
    const utcHour = timestamp.getUTCHours();
    let session: TradingSession;
    if (utcHour >= 0 && utcHour < 7) session = TradingSession.ASIAN;
    else if (utcHour >= 7 && utcHour < 8) session = TradingSession.LONDON;
    else if (utcHour >= 8 && utcHour < 13) session = TradingSession.LONDON;
    else if (utcHour >= 13 && utcHour < 16) session = TradingSession.LONDON_NEW_YORK_OVERLAP;
    else if (utcHour >= 16 && utcHour < 21) session = TradingSession.NEW_YORK;
    else session = TradingSession.CLOSED;

    return { session, utcHour };
  }

  private percentChange(candles: readonly Candle[]): number {
    if (candles.length < 2) return 0;
    const first = candles[0]!.close.amount;
    const last = candles[candles.length - 1]!.close.amount;
    return first === 0 ? 0 : ((last - first) / first) * 100;
  }

  private linearRegressionSlope(values: readonly number[]): number {
    const n = values.length;
    const xs = Array.from({ length: n }, (_, i) => i);
    const meanX = xs.reduce((sum, x) => sum + x, 0) / n;
    const meanY = values.reduce((sum, y) => sum + y, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i += 1) {
      numerator += (xs[i]! - meanX) * (values[i]! - meanY);
      denominator += (xs[i]! - meanX) ** 2;
    }
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private assertMinimum(candles: readonly Candle[], minimum: number): void {
    if (candles.length < minimum) {
      throw new InsufficientCandlesError(minimum, candles.length);
    }
  }
}
