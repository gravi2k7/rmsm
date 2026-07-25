// @rmsm/ai-extraction public API (AI-309 Structured Extraction Engine)

// Domain: entities
export type { ExtractionSchema } from "./domain/entities/extraction-schema.entity";
export type { ExtractionResult } from "./domain/entities/extraction-result.entity";
export type { TableExtractionResult } from "./domain/entities/table-extraction-result.entity";
export type { FieldMapping } from "./domain/entities/field-mapping.entity";

// Domain: errors
export {
  NoJsonFoundError,
  NoTableFoundError,
  SchemaValidationError,
  InvalidFieldMappingError,
} from "./domain/errors/extraction-domain.errors";

// Ports
export type { JsonExtractionProvider } from "./repositories/json-extraction-provider.interface";
export type { TableExtractionProvider } from "./repositories/table-extraction-provider.interface";

// Events
export type {
  JsonExtractedEvent,
  SchemaValidatedEvent,
  SchemaValidationFailedEvent,
  TableExtractedEvent,
  FieldsMappedEvent,
  ExtractionDomainEvent,
} from "./events/extraction-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

// Application
export { SchemaExtractionService } from "./application/services/schema-extraction.service";
export { DomainMappingService, type TransformFn } from "./application/services/domain-mapping.service";
export { TableExtractionService } from "./application/services/table-extraction.service";

// Infrastructure
export { RegexJsonExtractionProvider } from "./infrastructure/regex-json-extraction.provider";
export { MarkdownTableExtractionProvider } from "./infrastructure/markdown-table-extraction.provider";
export { InMemoryEventPublisher, type ExtractionEventListener } from "./infrastructure/in-memory-event-publisher";
