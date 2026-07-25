export interface DocumentPage {
  readonly pageNumber: number;
  readonly text: string;
}

/** The output of `DocumentParser.parse()` — plain extracted text, one
 * entry per page (a single-page result for formats with no native page
 * concept, e.g. plain text). Never carries provider-specific structure. */
export interface ParsedDocument {
  readonly sourceId: string;
  readonly pages: readonly DocumentPage[];
  readonly fullText: string;
}
