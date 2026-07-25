import type { Retriever } from "../repositories/retriever.interface";
import type { RetrievableChunk } from "../domain/entities/retrievable-chunk.entity";
import type { RetrievalQuery } from "../domain/entities/retrieval-query.entity";
import type { RetrievalResult } from "../domain/entities/retrieval-result.entity";
import { InvalidRetrievalQueryError } from "../domain/errors/rag-domain.errors";

function tokenize(text: string): readonly string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/**
 * The real, default `Retriever` — deterministic term-overlap scoring
 * (fraction of query terms present in a chunk's text), no embedding or
 * external search API involved. This is deliberately the ONLY concrete
 * `Retriever` this package ships; a `VectorStore`-backed semantic
 * retriever is a future implementation of the same `Retriever`
 * interface.
 */
export class KeywordRetriever implements Retriever {
  private readonly chunks = new Map<string, RetrievableChunk>();

  index(chunks: readonly RetrievableChunk[]): void {
    for (const chunk of chunks) {
      this.chunks.set(chunk.id, chunk);
    }
  }

  removeById(chunkId: string): void {
    this.chunks.delete(chunkId);
  }

  size(): number {
    return this.chunks.size;
  }

  async retrieve(query: RetrievalQuery): Promise<readonly RetrievalResult[]> {
    if (query.topK <= 0) {
      throw new InvalidRetrievalQueryError("topK must be positive");
    }
    const queryTerms = tokenize(query.text);
    if (queryTerms.length === 0) {
      throw new InvalidRetrievalQueryError("query text must contain at least one term");
    }

    const scored: RetrievalResult[] = [];
    for (const chunk of this.chunks.values()) {
      const chunkTerms = new Set(tokenize(chunk.text));
      const matches = queryTerms.filter((term) => chunkTerms.has(term)).length;
      if (matches > 0) {
        scored.push({ chunk, score: matches / queryTerms.length });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, query.topK);
  }
}
