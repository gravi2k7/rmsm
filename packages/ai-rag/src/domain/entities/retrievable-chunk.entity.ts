/** One indexable unit of text — deliberately generic (`id`, `text`,
 * `metadata`), not a re-export of `@rmsm/ai-documents`' `DocumentChunk`
 * or `@rmsm/ai-memory`'s `MemoryChunk`: callers convert their own
 * chunk shapes into this one when indexing, keeping this package
 * independent of either upstream package's schema. `embedding` is
 * optional and unused today — reserved for a future vector-backed
 * `Retriever` implementation. */
export interface RetrievableChunk {
  readonly id: string;
  readonly text: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly embedding?: readonly number[];
}
