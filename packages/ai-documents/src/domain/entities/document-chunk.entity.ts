/**
 * A structurally-chunked slice of a `ParsedDocument` — distinct from
 * `@rmsm/ai-memory`'s `MemoryChunk` (that one is a memory-recall
 * concern with an optional embedding; this one is a document-structure
 * concern produced purely by `DocumentChunker`, before anything is
 * ever handed to a memory or embedding system).
 */
export interface DocumentChunk {
  readonly id: string;
  readonly sourceId: string;
  readonly index: number;
  readonly text: string;
  readonly pageNumbers: readonly number[];
}
