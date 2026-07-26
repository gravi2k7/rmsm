import type { SentimentAnalysis } from "./sentiment-analysis.entity";
import type { MarketImpactEstimate } from "./market-impact-estimate.entity";
import type { NewsEventClassification } from "./news-event-classification.entity";

export interface NewsIntelligenceReport {
  readonly articleId: string;
  readonly sentiment: SentimentAnalysis;
  readonly classification: NewsEventClassification;
  readonly impact: MarketImpactEstimate;
  readonly narrative: string;
  readonly generatedAt: Date;
}
