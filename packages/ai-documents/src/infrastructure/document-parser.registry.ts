import type { DocumentParser } from "../repositories/document-parser.interface";
import type { DocumentSource } from "../domain/entities/document-source.entity";
import type { ParsedDocument } from "../domain/entities/parsed-document.entity";
import type { DocumentType } from "../domain/enums/document.enum";
import { UnsupportedDocumentTypeError } from "../domain/errors/document-domain.errors";

/** Dispatches a `DocumentSource` to the `DocumentParser` registered for
 * its `DocumentType` — the seam a future PDF/DOCX parser package plugs
 * into via `register()`, without this package needing to know about it. */
export class DocumentParserRegistry {
  private readonly parsers = new Map<DocumentType, DocumentParser>();

  register(parser: DocumentParser): void {
    this.parsers.set(parser.supportedType, parser);
  }

  async parse(source: DocumentSource): Promise<ParsedDocument> {
    const parser = this.parsers.get(source.type);
    if (!parser) {
      throw new UnsupportedDocumentTypeError(source.type);
    }
    return parser.parse(source);
  }
}
