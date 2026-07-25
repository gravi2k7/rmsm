import type { DocumentParser } from "../repositories/document-parser.interface";
import type { DocumentSource } from "../domain/entities/document-source.entity";
import type { ParsedDocument } from "../domain/entities/parsed-document.entity";
import { DocumentType } from "../domain/enums/document.enum";

/** The one real, concrete `DocumentParser` this package ships — plain
 * UTF-8 text has no format to parse, so this is a genuine (not stub)
 * implementation, single-page by convention. */
export class PlainTextDocumentParser implements DocumentParser {
  readonly supportedType = DocumentType.TEXT;

  async parse(source: DocumentSource): Promise<ParsedDocument> {
    const text = new TextDecoder("utf-8").decode(source.bytes);
    return {
      sourceId: source.id,
      pages: [{ pageNumber: 1, text }],
      fullText: text,
    };
  }
}
