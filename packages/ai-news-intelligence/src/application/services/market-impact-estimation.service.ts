import type { SymbolCode } from "@rmsm/market";
import type { SentimentAnalysis } from "../../domain/entities/sentiment-analysis.entity";
import type { NewsEventClassification } from "../../domain/entities/news-event-classification.entity";
import type { MarketImpactEstimate } from "../../domain/entities/market-impact-estimate.entity";
import { MarketImpactLevel, NewsEventCategory } from "../../domain/enums/news-intelligence.enum";

const HIGH_IMPACT_CATEGORIES: ReadonlySet<NewsEventCategory> = new Set([NewsEventCategory.CENTRAL_BANK, NewsEventCategory.ECONOMIC_DATA, NewsEventCategory.GEOPOLITICAL]);

/** Reads an already-computed `SentimentAnalysis` and
 * `NewsEventClassification` (both produced elsewhere in this package)
 * to estimate impact — never a second sentiment or classification pass. */
export class MarketImpactEstimationService {
  estimate(symbolCode: SymbolCode, sentiment: SentimentAnalysis, classification: NewsEventClassification): MarketImpactEstimate {
    const categoryIsHighImpact = HIGH_IMPACT_CATEGORIES.has(classification.category);
    const strongSentiment = Math.abs(sentiment.score) >= 0.5 && sentiment.confidence >= 0.3;

    let level: MarketImpactLevel;
    let reason: string;

    if (categoryIsHighImpact && strongSentiment) {
      level = MarketImpactLevel.HIGH;
      reason = `${classification.category} news with strong ${sentiment.label.toLowerCase()} sentiment.`;
    } else if (categoryIsHighImpact || strongSentiment) {
      level = MarketImpactLevel.MEDIUM;
      reason = categoryIsHighImpact ? `${classification.category} news, moderate sentiment strength.` : `Strong ${sentiment.label.toLowerCase()} sentiment, lower-impact category.`;
    } else {
      level = MarketImpactLevel.LOW;
      reason = "Neither category nor sentiment strength indicate significant market impact.";
    }

    return { articleId: sentiment.articleId, symbolCode: symbolCode.value, level, reason };
  }
}
