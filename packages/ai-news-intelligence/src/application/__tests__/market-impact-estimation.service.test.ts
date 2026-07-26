import { describe, expect, it } from "vitest";
import { MarketImpactEstimationService } from "../services/market-impact-estimation.service";
import { SentimentLabel, NewsEventCategory, MarketImpactLevel } from "../../domain/enums/news-intelligence.enum";
import { buildSymbolCode } from "./fakes";

describe("MarketImpactEstimationService", () => {
  const service = new MarketImpactEstimationService();

  it("rates HIGH impact for a high-impact category with strong, confident sentiment", () => {
    const sentiment = { articleId: "a1", label: SentimentLabel.NEGATIVE, score: -0.8, confidence: 0.6 };
    const classification = { articleId: "a1", category: NewsEventCategory.CENTRAL_BANK, reason: "" };

    const result = service.estimate(buildSymbolCode(), sentiment, classification);
    expect(result.level).toBe(MarketImpactLevel.HIGH);
  });

  it("rates LOW impact for a low-impact category with weak sentiment", () => {
    const sentiment = { articleId: "a1", label: SentimentLabel.NEUTRAL, score: 0.05, confidence: 0.1 };
    const classification = { articleId: "a1", category: NewsEventCategory.OTHER, reason: "" };

    const result = service.estimate(buildSymbolCode(), sentiment, classification);
    expect(result.level).toBe(MarketImpactLevel.LOW);
  });
});
