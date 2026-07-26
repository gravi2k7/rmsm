import { describe, expect, it } from "vitest";
import { SentimentAnalysisService } from "../services/sentiment-analysis.service";
import { SentimentLabel } from "../../domain/enums/news-intelligence.enum";
import { buildArticle } from "./fakes";

describe("SentimentAnalysisService", () => {
  const service = new SentimentAnalysisService();

  it("rates upbeat, positive-word-heavy text as POSITIVE", () => {
    const article = buildArticle({ headline: "Stock surges on record growth", body: "Strong gains and an upgrade boosted optimism." });
    const result = service.analyze(article);
    expect(result.label).toBe(SentimentLabel.POSITIVE);
    expect(result.score).toBeGreaterThan(0);
  });

  it("rates downbeat, negative-word-heavy text as NEGATIVE", () => {
    const article = buildArticle({ headline: "Shares plunge amid recession fears", body: "Weak results and a downgrade triggered losses and a crisis of confidence." });
    const result = service.analyze(article);
    expect(result.label).toBe(SentimentLabel.NEGATIVE);
    expect(result.score).toBeLessThan(0);
  });

  it("rates text with no sentiment-bearing words as NEUTRAL", () => {
    const article = buildArticle({ headline: "Company holds annual meeting", body: "Executives discussed routine operational matters." });
    const result = service.analyze(article);
    expect(result.label).toBe(SentimentLabel.NEUTRAL);
  });
});
