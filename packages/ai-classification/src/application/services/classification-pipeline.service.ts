import type { IdGenerator, Clock } from "@rmsm/core";
import type { IntentClassifier } from "../../repositories/intent-classifier.interface";
import type { TopicClassifier } from "../../repositories/topic-classifier.interface";
import type { SentimentAnalyzer } from "../../repositories/sentiment-analyzer.interface";
import type { ModerationProvider } from "../../repositories/moderation-provider.interface";
import type { ClassificationReport } from "../../domain/entities/classification-report.entity";
import type { IntentResult } from "../../domain/entities/intent-result.entity";
import { RuleEngine } from "./rule-engine.service";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type {
  RuleMatchedEvent,
  IntentDetectedEvent,
  TopicsClassifiedEvent,
  SentimentAnalyzedEvent,
  ContentModeratedEvent,
  ClassificationDomainEvent,
} from "../../events/classification-domain-events.interface";

/**
 * Runs one input through every classification concern this package
 * offers and assembles a single `ClassificationReport`. The `RuleEngine`
 * is consulted first (per "rule engine hooks" — deterministic,
 * human-authored rules always get a chance to short-circuit before the
 * keyword-statistics-based `IntentClassifier` runs); if a rule matches,
 * its label + a confidence of 1 (a human-authored rule matching is
 * maximally confident) is used as the intent instead of running the
 * classifier at all.
 */
export class ClassificationPipeline {
  constructor(
    private readonly ruleEngine: RuleEngine,
    private readonly intentClassifier: IntentClassifier,
    private readonly topicClassifier: TopicClassifier,
    private readonly sentimentAnalyzer: SentimentAnalyzer,
    private readonly moderationProvider: ModerationProvider,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async classify(text: string): Promise<ClassificationReport> {
    const ruleMatch = this.ruleEngine.match(text);
    let intent: IntentResult;

    if (ruleMatch) {
      intent = { intent: ruleMatch.rule.label, confidence: 1, alternatives: [] };
      await this.publish([this.ruleMatchedEvent(ruleMatch.rule.id, ruleMatch.rule.label)]);
    } else {
      intent = await this.intentClassifier.classify(text);
    }
    await this.publish([this.intentDetectedEvent(intent)]);

    const topics = await this.topicClassifier.classify(text);
    await this.publish([this.topicsClassifiedEvent(topics.topics.length)]);

    const sentiment = await this.sentimentAnalyzer.analyze(text);
    await this.publish([this.sentimentAnalyzedEvent(sentiment.sentiment, sentiment.confidence)]);

    const moderation = await this.moderationProvider.moderate(text);
    await this.publish([this.moderationEvent(moderation.flagged, moderation.categories)]);

    return { text, ruleMatch, intent, topics, sentiment, moderation };
  }

  private ruleMatchedEvent(ruleId: string, label: string): RuleMatchedEvent {
    return { eventId: this.idGenerator.generate(), kind: "RuleMatched", occurredAt: this.clock.now(), aggregateId: ruleId, ruleId, label };
  }

  private intentDetectedEvent(intent: IntentResult): IntentDetectedEvent {
    return {
      eventId: this.idGenerator.generate(),
      kind: "IntentDetected",
      occurredAt: this.clock.now(),
      aggregateId: intent.intent,
      intent: intent.intent,
      confidence: intent.confidence,
    };
  }

  private topicsClassifiedEvent(topicCount: number): TopicsClassifiedEvent {
    return { eventId: this.idGenerator.generate(), kind: "TopicsClassified", occurredAt: this.clock.now(), aggregateId: this.idGenerator.generate(), topicCount };
  }

  private sentimentAnalyzedEvent(sentiment: string, confidence: number): SentimentAnalyzedEvent {
    return { eventId: this.idGenerator.generate(), kind: "SentimentAnalyzed", occurredAt: this.clock.now(), aggregateId: sentiment, sentiment, confidence };
  }

  private moderationEvent(flagged: boolean, categories: readonly string[]): ContentModeratedEvent {
    return { eventId: this.idGenerator.generate(), kind: "ContentModerated", occurredAt: this.clock.now(), aggregateId: this.idGenerator.generate(), flagged, categories };
  }

  private async publish(events: readonly ClassificationDomainEvent[]): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
