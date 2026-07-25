import type { IndexEntry } from "../domain/entities/index-entry.entity";
import type { SemanticSearchResult } from "../domain/entities/semantic-search-result.entity";
import type { EmbeddingVector } from "../domain/entities/embedding-vector.entity";

/**
 * The spec's "future vector providers" abstraction — an external
 * vector database (Pinecone/Weaviate/pgvector/etc.) is a future
 * implementation of this exact interface. `InMemoryVectorIndex` (real,
 * cosine-similarity-based) is the only concrete implementation this
 * package ships.
 */
export interface VectorIndexProvider {
  upsert(entries: readonly IndexEntry[]): Promise<void>;
  search(queryVector: EmbeddingVector, topK: number): Promise<readonly SemanticSearchResult[]>;
  delete(id: string): Promise<void>;
}
