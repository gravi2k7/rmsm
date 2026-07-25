import type { ParsedDocument } from "./parsed-document.entity";
import type { DocumentChunk } from "./document-chunk.entity";
import type { DocumentMetadata } from "./document-metadata.entity";

/** The one, complete output of `DocumentIntelligenceService.process()` —
 * everything a caller needs (text, chunks, metadata, and an optional
 * summary) from a single document, in one shape. */
export interface ExtractionResult {
  readonly parsed: ParsedDocument;
  readonly chunks: readonly DocumentChunk[];
  readonly metadata: DocumentMetadata;
  readonly summary?: string;
}
