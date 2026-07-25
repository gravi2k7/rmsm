import type { ParsedDocument } from "../../domain/entities/parsed-document.entity";
import type { DocumentChunk } from "../../domain/entities/document-chunk.entity";
import { InvalidChunkOptionsError } from "../../domain/errors/document-domain.errors";

export interface ChunkOptions {
  readonly maxChunkChars: number;
  readonly overlapChars?: number;
}

/**
 * Splits a `ParsedDocument`'s full text into fixed-size, slightly
 * overlapping `DocumentChunk`s — a structural concern, deliberately
 * kept separate from any embedding/retrieval logic (that's AI-304/305's
 * job, consuming these chunks as input, not this package's).
 */
export class DocumentChunker {
  chunk(document: ParsedDocument, options: ChunkOptions): readonly DocumentChunk[] {
    if (options.maxChunkChars <= 0) {
      throw new InvalidChunkOptionsError("maxChunkChars must be positive");
    }
    const overlap = options.overlapChars ?? 0;
    if (overlap < 0 || overlap >= options.maxChunkChars) {
      throw new InvalidChunkOptionsError("overlapChars must be non-negative and smaller than maxChunkChars");
    }

    const chunks: DocumentChunk[] = [];
    const text = document.fullText;
    let start = 0;
    let index = 0;

    while (start < text.length) {
      const end = Math.min(start + options.maxChunkChars, text.length);
      const chunkText = text.slice(start, end);
      chunks.push({
        id: `${document.sourceId}-chunk-${index}`,
        sourceId: document.sourceId,
        index,
        text: chunkText,
        pageNumbers: this.pagesOverlapping(document, start, end),
      });
      index += 1;
      if (end === text.length) break;
      start = end - overlap;
    }

    return chunks;
  }

  private pagesOverlapping(document: ParsedDocument, start: number, end: number): readonly number[] {
    let cursor = 0;
    const pages: number[] = [];
    for (const page of document.pages) {
      const pageStart = cursor;
      const pageEnd = cursor + page.text.length;
      if (pageEnd > start && pageStart < end) {
        pages.push(page.pageNumber);
      }
      cursor = pageEnd;
    }
    return pages;
  }
}
