import type { DomainEvent } from "@rmsm/core";

export interface JsonExtractedEvent extends DomainEvent {
  readonly kind: "JsonExtracted";
}

export interface SchemaValidatedEvent extends DomainEvent {
  readonly kind: "SchemaValidated";
  readonly schemaName: string;
}

export interface SchemaValidationFailedEvent extends DomainEvent {
  readonly kind: "SchemaValidationFailed";
  readonly schemaName: string;
  readonly issueCount: number;
}

export interface TableExtractedEvent extends DomainEvent {
  readonly kind: "TableExtracted";
  readonly rowCount: number;
}

export interface FieldsMappedEvent extends DomainEvent {
  readonly kind: "FieldsMapped";
  readonly mappedFieldCount: number;
}

export type ExtractionDomainEvent =
  | JsonExtractedEvent
  | SchemaValidatedEvent
  | SchemaValidationFailedEvent
  | TableExtractedEvent
  | FieldsMappedEvent;
