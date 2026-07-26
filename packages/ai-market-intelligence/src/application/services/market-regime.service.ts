import type { Candle } from "@rmsm/market";
import { MarketAnalysisService } from "./market-analysis.service";
import { MarketRegime, TrendDirection, VolatilityLevel } from "../../domain/enums/market-intelligence.enum";
import type { RegimeAnalysis } from "../../domain/entities/regime-analysis.entity";

/** The "market regime detection" capability: synthesizes
 * `MarketAnalysisService.analyzeTrend` + `analyzeVolatility` into one
 * of five regimes, never recomputing trend/volatility itself. */
export class MarketRegimeService {
  constructor(private readonly marketAnalysis: MarketAnalysisService = new MarketAnalysisService()) {}

  detect(candles: readonly Candle[]): RegimeAnalysis {
    const trend = this.marketAnalysis.analyzeTrend(candles);
    const volatility = this.marketAnalysis.analyzeVolatility(candles);

    if (volatility.level === VolatilityLevel.EXTREME) {
      return { regime: MarketRegime.VOLATILE, confidence: 0.9, reason: "Return volatility is extreme regardless of trend direction." };
    }
    if (trend.direction === TrendDirection.UP && trend.strength > 0.3) {
      return { regime: MarketRegime.TRENDING_UP, confidence: trend.strength, reason: "Price shows a sustained upward slope with meaningful strength." };
    }
    if (trend.direction === TrendDirection.DOWN && trend.strength > 0.3) {
      return { regime: MarketRegime.TRENDING_DOWN, confidence: trend.strength, reason: "Price shows a sustained downward slope with meaningful strength." };
    }
    if (volatility.level === VolatilityLevel.LOW) {
      return { regime: MarketRegime.QUIET, confidence: 0.7, reason: "Low volatility with no meaningful directional trend." };
    }
    return { regime: MarketRegime.RANGING, confidence: 0.6, reason: "No sustained trend and volatility is not low enough to call the market quiet." };
  }
}
