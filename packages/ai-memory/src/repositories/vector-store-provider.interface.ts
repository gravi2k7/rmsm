import type { MemoryChunk } from "../domain/entities/memory-chunk.entity";

/**
 * "Future Vector Store support" — an abstraction only, per the spec's
 * own explicit instruction ("Do NOT implement vector storage yet. Only
 * abstractions."). No implementation of this interface exists anywhere
 * in this package; `MemoryRetriever.query()`'s `searchText` matching is
 * plain substring matching today. A real implementation (pgvector,
 * Pinecone, Qdrant, ...) implements this port and is wired in wherever
 * a consumer composes `MemoryRetriever` — no other application-layer
 * code changes when that day comes.
 */
export interface VectorStoreProvider {
  upsert(chunk: MemoryChunk): Promise<void>;
  similaritySearch(embedding: readonly number[], limit: number): Promise<readonly MemoryChunk[]>;
  delete(chunkId: string): Promise<void>;
}
