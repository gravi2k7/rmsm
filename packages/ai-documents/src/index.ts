// @rmsm/ai-documents public API (AI-302 Document Intelligence)

// Domain: enums
export { DocumentType, DOCUMENT_TYPES } from "./domain/enums/document.enum";

// Domain: entities
export type { DocumentSource } from "./domain/entities/document-source.entity";
export type { DocumentPage, ParsedDocument } from "./domain/entities/parsed-document.entity";
export type { DocumentChunk } from "./domain/entities/document-chunk.entity";
export type { DocumentMetadata } from "./domain/entities/document-metadata.entity";
export type { ExtractionResult } from "./domain/entities/extraction-result.entity";

// Domain: errors
export {
  UnsupportedDocumentTypeError,
  DocumentParseError,
  EmptyDocumentError,
  InvalidChunkOptionsError,
} from "./domain/errors/document-domain.errors";

// Ports
export type { DocumentParser } from "./repositories/document-parser.interface";
export type { OcrProvider } from "./repositories/ocr-provider.interface";

// Events
export type {
  DocumentParsedEvent,
  DocumentChunkedEvent,
  DocumentSummarizedEvent,
  DocumentParseFailedEvent,
  DocumentDomainEvent,
} from "./events/document-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

// Application
export { DocumentChunker, type ChunkOptions } from "./application/services/document-chunker.service";
export { DocumentIntelligenceService } from "./application/services/document-intelligence.service";

// Infrastructure
export { PlainTextDocumentParser } from "./infrastructure/plain-text-document.parser";
export { DocumentParserRegistry } from "./infrastructure/document-parser.registry";
export { InMemoryEventPublisher, type DocumentEventListener } from "./infrastructure/in-memory-event-publisher";
