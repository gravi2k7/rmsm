// @rmsm/ai-classification public API (AI-306 Classification Engine)

// Domain: enums
export { Sentiment, SENTIMENTS } from "./domain/enums/classification.enum";

// Domain: entities
export type { ClassificationLabel } from "./domain/entities/classification-label.entity";
export type { IntentResult } from "./domain/entities/intent-result.entity";
export type { TopicResult } from "./domain/entities/topic-result.entity";
export type { SentimentResult } from "./domain/entities/sentiment-result.entity";
export type { ModerationResult } from "./domain/entities/moderation-result.entity";
export type { ClassificationRule, RuleMatch } from "./domain/entities/classification-rule.entity";
export type { ClassificationReport } from "./domain/entities/classification-report.entity";

// Domain: errors
export {
  EmptyClassificationInputError,
  InvalidRuleDefinitionError,
  InvalidConfidenceThresholdError,
} from "./domain/errors/classification-domain.errors";

// Ports
export type { IntentClassifier } from "./repositories/intent-classifier.interface";
export type { TopicClassifier } from "./repositories/topic-classifier.interface";
export type { SentimentAnalyzer } from "./repositories/sentiment-analyzer.interface";
export type { ModerationProvider } from "./repositories/moderation-provider.interface";

// Events
export type {
  RuleMatchedEvent,
  IntentDetectedEvent,
  TopicsClassifiedEvent,
  SentimentAnalyzedEvent,
  ContentModeratedEvent,
  ClassificationDomainEvent,
} from "./events/classification-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

// Application
export { RuleEngine } from "./application/services/rule-engine.service";
export { ConfidenceScorer } from "./application/services/confidence-scorer.service";
export { ClassificationPipeline } from "./application/services/classification-pipeline.service";

// Infrastructure
export { RuleBasedIntentClassifier } from "./infrastructure/rule-based-intent.classifier";
export { KeywordTopicClassifier } from "./infrastructure/keyword-topic.classifier";
export { LexiconSentimentAnalyzer } from "./infrastructure/lexicon-sentiment.analyzer";
export { KeywordModerationProvider } from "./infrastructure/keyword-moderation.provider";
export { InMemoryEventPublisher, type ClassificationEventListener } from "./infrastructure/in-memory-event-publisher";
