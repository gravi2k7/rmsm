import type { DomainEvent } from "@rmsm/core";

export interface ChunkSummarizedEvent extends DomainEvent {
  readonly kind: "ChunkSummarized";
  readonly chunkIndex: number;
}

export interface LevelSummarizedEvent extends DomainEvent {
  readonly kind: "LevelSummarized";
  readonly level: number;
  readonly nodeCount: number;
}

export interface RecursiveSummarizationCompletedEvent extends DomainEvent {
  readonly kind: "RecursiveSummarizationCompleted";
  readonly roundsUsed: number;
}

export interface ConversationSummarizedEvent extends DomainEvent {
  readonly kind: "ConversationSummarized";
  readonly messageCount: number;
}

export interface DocumentSummarizedEvent extends DomainEvent {
  readonly kind: "DocumentSummarized";
  readonly characterCount: number;
}

export type SummarizationDomainEvent =
  | ChunkSummarizedEvent
  | LevelSummarizedEvent
  | RecursiveSummarizationCompletedEvent
  | ConversationSummarizedEvent
  | DocumentSummarizedEvent;
