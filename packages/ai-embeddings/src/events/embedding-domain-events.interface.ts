import type { DomainEvent } from "@rmsm/core";

export interface EmbeddingsComputedEvent extends DomainEvent {
  readonly kind: "EmbeddingsComputed";
  readonly textCount: number;
  readonly cacheHits: number;
}

export interface IndexUpdatedEvent extends DomainEvent {
  readonly kind: "IndexUpdated";
  readonly entryCount: number;
}

export interface SemanticSearchCompletedEvent extends DomainEvent {
  readonly kind: "SemanticSearchCompleted";
  readonly queryText: string;
  readonly resultCount: number;
}

export type EmbeddingDomainEvent = EmbeddingsComputedEvent | IndexUpdatedEvent | SemanticSearchCompletedEvent;
