import { describe, it, expect, beforeEach } from "vitest";
import { ClassificationPipeline } from "../services/classification-pipeline.service";
import { RuleEngine } from "../services/rule-engine.service";
import { RuleBasedIntentClassifier } from "../../infrastructure/rule-based-intent.classifier";
import { KeywordTopicClassifier } from "../../infrastructure/keyword-topic.classifier";
import { LexiconSentimentAnalyzer } from "../../infrastructure/lexicon-sentiment.analyzer";
import { KeywordModerationProvider } from "../../infrastructure/keyword-moderation.provider";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("ClassificationPipeline", () => {
  let ruleEngine: RuleEngine;
  let pipeline: ClassificationPipeline;
  let events: RecordingEventPublisher;

  beforeEach(() => {
    ruleEngine = new RuleEngine();
    ruleEngine.register({ id: "r1", keywords: ["refund"], label: "refund_request", priority: 1 });
    events = new RecordingEventPublisher();

    pipeline = new ClassificationPipeline(
      ruleEngine,
      new RuleBasedIntentClassifier(ruleEngine),
      new KeywordTopicClassifier({ commerce: ["refund", "order", "purchase"] }),
      new LexiconSentimentAnalyzer(),
      new KeywordModerationProvider({ profanity: ["badword"] }),
      new FixedClock(new Date("2026-01-01T00:00:00.000Z")),
      new SequentialIdGenerator(),
      events,
    );
  });

  it("short-circuits intent detection via a matched rule, at full confidence", async () => {
    const report = await pipeline.classify("I want a refund for my order, it was terrible");

    expect(report.ruleMatch?.rule.id).toBe("r1");
    expect(report.intent.intent).toBe("refund_request");
    expect(report.intent.confidence).toBe(1);
    expect(report.topics.topics.map((t) => t.name)).toContain("commerce");
    expect(report.sentiment.sentiment).toBe("negative");
    expect(report.moderation.flagged).toBe(false);

    expect(events.published.map((e) => e.kind)).toEqual([
      "RuleMatched",
      "IntentDetected",
      "TopicsClassified",
      "SentimentAnalyzed",
      "ContentModerated",
    ]);
  });

  it("falls back to the IntentClassifier when no rule matches", async () => {
    const report = await pipeline.classify("what is the weather like today");

    expect(report.ruleMatch).toBeNull();
    expect(report.intent.intent).toBe("unknown");
    expect(events.published.map((e) => e.kind)).toEqual([
      "IntentDetected",
      "TopicsClassified",
      "SentimentAnalyzed",
      "ContentModerated",
    ]);
  });

  it("flags moderated content", async () => {
    const report = await pipeline.classify("this message contains a badword");
    expect(report.moderation.flagged).toBe(true);
  });
});
