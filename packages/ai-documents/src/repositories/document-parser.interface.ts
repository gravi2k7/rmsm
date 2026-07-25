import type { DocumentSource } from "../domain/entities/document-source.entity";
import type { ParsedDocument } from "../domain/entities/parsed-document.entity";
import type { DocumentType } from "../domain/enums/document.enum";

/** Format-specific text extraction, abstracted per the spec's own "PDF
 * parser abstraction" / "DOCX parser abstraction" split — each format
 * gets its own `DocumentParser` implementation, registered by
 * `DocumentType` into a `DocumentParserRegistry`. This package ships
 * one real implementation, `PlainTextDocumentParser` — PDF/DOCX parsers
 * need heavy external libraries and are a future package's concern,
 * plugging into this exact interface. */
export interface DocumentParser {
  readonly supportedType: DocumentType;
  parse(source: DocumentSource): Promise<ParsedDocument>;
}
