import type { Candle, Timeframe } from "@rmsm/market";
import { MarketAnalysisService } from "./market-analysis.service";
import { TrendDirection } from "../../domain/enums/market-intelligence.enum";
import type { MultiTimeframeAnalysis, TimeframeTrendSummary } from "../../domain/entities/multi-timeframe-analysis.entity";
import { EmptyTimeframeSetError } from "../../domain/errors/market-intelligence-domain.errors";

/** The "multi-timeframe analysis" capability: runs
 * `MarketAnalysisService.analyzeTrend` once per supplied timeframe
 * (never a separate trend implementation) and checks whether every
 * timeframe agrees on direction. */
export class MultiTimeframeAnalysisService {
  constructor(private readonly marketAnalysis: MarketAnalysisService = new MarketAnalysisService()) {}

  analyze(candlesByTimeframe: ReadonlyMap<Timeframe, readonly Candle[]>): MultiTimeframeAnalysis {
    if (candlesByTimeframe.size === 0) {
      throw new EmptyTimeframeSetError();
    }

    const timeframes: TimeframeTrendSummary[] = [];
    for (const [timeframe, candles] of candlesByTimeframe.entries()) {
      const trend = this.marketAnalysis.analyzeTrend(candles);
      timeframes.push({ timeframe, direction: trend.direction, strength: trend.strength });
    }

    const nonSidewaysDirections = new Set(timeframes.map((t) => t.direction).filter((d) => d !== TrendDirection.SIDEWAYS));
    const aligned = nonSidewaysDirections.size <= 1;

    const dominantDirection = this.dominantDirection(timeframes);
    return { timeframes, aligned, dominantDirection };
  }

  private dominantDirection(timeframes: readonly TimeframeTrendSummary[]): TrendDirection {
    const votes = new Map<TrendDirection, number>();
    for (const summary of timeframes) {
      votes.set(summary.direction, (votes.get(summary.direction) ?? 0) + summary.strength);
    }
    let best: TrendDirection = TrendDirection.SIDEWAYS;
    let bestScore = -Infinity;
    for (const [direction, score] of votes.entries()) {
      if (score > bestScore) {
        best = direction;
        bestScore = score;
      }
    }
    return best;
  }
}
