import type { MarketImpactLevel } from "../enums/news-intelligence.enum";

/** Reads an already-computed `SentimentAnalysis` and
 * `NewsEventClassification` — never a second sentiment or
 * classification pass. */
export interface MarketImpactEstimate {
  readonly articleId: string;
  readonly symbolCode: string;
  readonly level: MarketImpactLevel;
  readonly reason: string;
}
