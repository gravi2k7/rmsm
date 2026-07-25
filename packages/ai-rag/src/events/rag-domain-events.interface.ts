import type { DomainEvent } from "@rmsm/core";

export interface ChunksIndexedEvent extends DomainEvent {
  readonly kind: "ChunksIndexed";
  readonly chunkCount: number;
}

export interface RetrievalCompletedEvent extends DomainEvent {
  readonly kind: "RetrievalCompleted";
  readonly queryText: string;
  readonly resultCount: number;
}

export interface ContextBuiltEvent extends DomainEvent {
  readonly kind: "ContextBuilt";
  readonly usedResultCount: number;
  readonly truncated: boolean;
}

export type RagDomainEvent = ChunksIndexedEvent | RetrievalCompletedEvent | ContextBuiltEvent;
