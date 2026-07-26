import type { Candle } from "@rmsm/market";
import { MarketAnalysisService } from "./market-analysis.service";
import { LiquidityLevel, MarketStructure, VolatilityLevel } from "../../domain/enums/market-intelligence.enum";
import type { MarketScore } from "../../domain/entities/market-score.entity";

const VOLATILITY_SCORE: Readonly<Record<VolatilityLevel, number>> = {
  [VolatilityLevel.LOW]: 40,
  [VolatilityLevel.MODERATE]: 90,
  [VolatilityLevel.HIGH]: 60,
  [VolatilityLevel.EXTREME]: 20,
};

const LIQUIDITY_SCORE: Readonly<Record<LiquidityLevel, number>> = {
  [LiquidityLevel.LOW]: 30,
  [LiquidityLevel.MODERATE]: 70,
  [LiquidityLevel.HIGH]: 100,
};

/** The "market scoring" capability: a 0..100 composite built from
 * trend strength, a volatility "tradeability" curve (moderate
 * volatility scores highest — too little offers no opportunity, too
 * much is unmanageable risk), structure clarity, and liquidity. Every
 * component reuses `MarketAnalysisService`'s own analyses. */
export class MarketScoringService {
  constructor(private readonly marketAnalysis: MarketAnalysisService = new MarketAnalysisService()) {}

  score(candles: readonly Candle[]): MarketScore {
    const trend = this.marketAnalysis.analyzeTrend(candles);
    const volatility = this.marketAnalysis.analyzeVolatility(candles);
    const structure = this.marketAnalysis.analyzeStructure(candles);
    const liquidity = this.marketAnalysis.analyzeLiquidity(candles);

    const trendScore = trend.strength * 100;
    const volatilityScore = VOLATILITY_SCORE[volatility.level];
    const structureScore = structure.structure === MarketStructure.CONSOLIDATION ? 40 : 80;
    const liquidityScore = LIQUIDITY_SCORE[liquidity.level];

    const components = { trend: trendScore, volatility: volatilityScore, structure: structureScore, liquidity: liquidityScore };
    const overall = Object.values(components).reduce((sum, v) => sum + v, 0) / Object.values(components).length;

    return { overall, components };
  }
}
