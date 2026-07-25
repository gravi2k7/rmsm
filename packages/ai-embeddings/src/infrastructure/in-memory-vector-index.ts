import type { VectorIndexProvider } from "../repositories/vector-index-provider.interface";
import type { IndexEntry } from "../domain/entities/index-entry.entity";
import type { EmbeddingVector } from "../domain/entities/embedding-vector.entity";
import type { SemanticSearchResult } from "../domain/entities/semantic-search-result.entity";
import { EmbeddingDimensionMismatchError } from "../domain/errors/embedding-domain.errors";

function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  return denominator === 0 ? 0 : dot / denominator;
}

/** The real, default `VectorIndexProvider` — in-memory, exact
 * (brute-force) cosine-similarity search. This is deliberately the
 * ONLY concrete `VectorIndexProvider` this package ships; a real
 * Pinecone/Weaviate/pgvector adapter is a future package's concern. */
export class InMemoryVectorIndex implements VectorIndexProvider {
  private readonly entries = new Map<string, IndexEntry>();

  async upsert(entries: readonly IndexEntry[]): Promise<void> {
    for (const entry of entries) {
      this.entries.set(entry.id, entry);
    }
  }

  async delete(id: string): Promise<void> {
    this.entries.delete(id);
  }

  size(): number {
    return this.entries.size;
  }

  async search(queryVector: EmbeddingVector, topK: number): Promise<readonly SemanticSearchResult[]> {
    const results: SemanticSearchResult[] = [];
    for (const entry of this.entries.values()) {
      if (entry.vector.dimensions !== queryVector.dimensions) {
        throw new EmbeddingDimensionMismatchError(queryVector.dimensions, entry.vector.dimensions);
      }
      results.push({ entry, similarity: cosineSimilarity(queryVector.values, entry.vector.values) });
    }
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }
}
