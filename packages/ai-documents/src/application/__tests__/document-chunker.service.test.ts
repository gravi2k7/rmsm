import { describe, it, expect } from "vitest";
import { DocumentChunker } from "../services/document-chunker.service";
import { InvalidChunkOptionsError } from "../../domain/errors/document-domain.errors";
import type { ParsedDocument } from "../../domain/entities/parsed-document.entity";

describe("DocumentChunker", () => {
  const chunker = new DocumentChunker();
  const document: ParsedDocument = {
    sourceId: "s1",
    pages: [{ pageNumber: 1, text: "a".repeat(10) }, { pageNumber: 2, text: "b".repeat(10) }],
    fullText: "a".repeat(10) + "b".repeat(10),
  };

  it("splits text into chunks of at most maxChunkChars", () => {
    const chunks = chunker.chunk(document, { maxChunkChars: 8 });
    expect(chunks.every((c) => c.text.length <= 8)).toBe(true);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("produces overlapping chunks when overlapChars is set", () => {
    const chunks = chunker.chunk(document, { maxChunkChars: 8, overlapChars: 2 });
    expect(chunks[0]?.text.slice(-2)).toBe(chunks[1]?.text.slice(0, 2));
  });

  it("assigns pageNumbers based on which pages a chunk overlaps", () => {
    const chunks = chunker.chunk(document, { maxChunkChars: 20 });
    expect(chunks[0]?.pageNumbers).toEqual([1, 2]);
  });

  it("throws InvalidChunkOptionsError for a non-positive maxChunkChars", () => {
    expect(() => chunker.chunk(document, { maxChunkChars: 0 })).toThrow(InvalidChunkOptionsError);
  });

  it("throws InvalidChunkOptionsError when overlapChars >= maxChunkChars", () => {
    expect(() => chunker.chunk(document, { maxChunkChars: 5, overlapChars: 5 })).toThrow(InvalidChunkOptionsError);
  });
});
