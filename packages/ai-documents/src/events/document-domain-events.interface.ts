import type { DomainEvent } from "@rmsm/core";

export interface DocumentParsedEvent extends DomainEvent {
  readonly kind: "DocumentParsed";
  readonly sourceId: string;
  readonly pageCount: number;
}

export interface DocumentChunkedEvent extends DomainEvent {
  readonly kind: "DocumentChunked";
  readonly sourceId: string;
  readonly chunkCount: number;
}

export interface DocumentSummarizedEvent extends DomainEvent {
  readonly kind: "DocumentSummarized";
  readonly sourceId: string;
}

export interface DocumentParseFailedEvent extends DomainEvent {
  readonly kind: "DocumentParseFailed";
  readonly sourceId: string;
  readonly reason: string;
}

export type DocumentDomainEvent =
  | DocumentParsedEvent
  | DocumentChunkedEvent
  | DocumentSummarizedEvent
  | DocumentParseFailedEvent;
