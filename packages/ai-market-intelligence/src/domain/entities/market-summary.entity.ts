import type { RegimeAnalysis } from "./regime-analysis.entity";
import type { TrendAnalysis } from "./trend-analysis.entity";
import type { VolatilityAnalysis } from "./volatility-analysis.entity";
import type { MarketScore } from "./market-score.entity";
import type { MarketAlert } from "./market-alert.entity";

/** The "market summary generation" / "market explanation" capabilities'
 * unit of record — every other analysis composed into one narrative
 * plus its structured inputs, so a caller gets both the human-readable
 * explanation and the data that produced it. */
export interface MarketSummary {
  readonly symbolCode: string;
  readonly narrative: string;
  readonly regime: RegimeAnalysis;
  readonly trend: TrendAnalysis;
  readonly volatility: VolatilityAnalysis;
  readonly score: MarketScore;
  readonly alerts: readonly MarketAlert[];
  readonly generatedAt: Date;
}
