import { describe, it, expect } from "vitest";
import { LexiconSentimentAnalyzer } from "../lexicon-sentiment.analyzer";
import { Sentiment } from "../../domain/enums/classification.enum";

describe("LexiconSentimentAnalyzer", () => {
  const analyzer = new LexiconSentimentAnalyzer();

  it("detects positive sentiment", async () => {
    const result = await analyzer.analyze("this is a great and wonderful product");
    expect(result.sentiment).toBe(Sentiment.POSITIVE);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("detects negative sentiment", async () => {
    const result = await analyzer.analyze("this is a terrible and awful experience");
    expect(result.sentiment).toBe(Sentiment.NEGATIVE);
  });

  it("returns neutral with zero confidence for text with no sentiment words", async () => {
    const result = await analyzer.analyze("the meeting is at 3pm");
    expect(result.sentiment).toBe(Sentiment.NEUTRAL);
    expect(result.confidence).toBe(0);
  });

  it("returns neutral when positive and negative signals are balanced", async () => {
    const result = await analyzer.analyze("good but bad");
    expect(result.sentiment).toBe(Sentiment.NEUTRAL);
    expect(result.confidence).toBe(0.5);
  });
});
