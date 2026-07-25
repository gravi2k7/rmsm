import type { RetrievableChunk } from "../domain/entities/retrievable-chunk.entity";

/** Abstraction only — the spec's "future vector store interfaces" /
 * "future hybrid retrieval" capabilities. Mirrors `@rmsm/ai-memory`'s
 * own `VectorStoreProvider` abstraction-only pattern; zero
 * implementations ship in this package. A real implementation would
 * back a `Retriever` that does genuine semantic search. */
export interface VectorStore {
  upsert(chunks: readonly RetrievableChunk[]): Promise<void>;
  similaritySearch(embedding: readonly number[], topK: number): Promise<readonly RetrievableChunk[]>;
  delete(chunkId: string): Promise<void>;
}
