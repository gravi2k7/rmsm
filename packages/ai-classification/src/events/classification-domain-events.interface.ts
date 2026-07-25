import type { DomainEvent } from "@rmsm/core";

export interface RuleMatchedEvent extends DomainEvent {
  readonly kind: "RuleMatched";
  readonly ruleId: string;
  readonly label: string;
}

export interface IntentDetectedEvent extends DomainEvent {
  readonly kind: "IntentDetected";
  readonly intent: string;
  readonly confidence: number;
}

export interface TopicsClassifiedEvent extends DomainEvent {
  readonly kind: "TopicsClassified";
  readonly topicCount: number;
}

export interface SentimentAnalyzedEvent extends DomainEvent {
  readonly kind: "SentimentAnalyzed";
  readonly sentiment: string;
  readonly confidence: number;
}

export interface ContentModeratedEvent extends DomainEvent {
  readonly kind: "ContentModerated";
  readonly flagged: boolean;
  readonly categories: readonly string[];
}

export type ClassificationDomainEvent =
  | RuleMatchedEvent
  | IntentDetectedEvent
  | TopicsClassifiedEvent
  | SentimentAnalyzedEvent
  | ContentModeratedEvent;
