import type { RetrievalQuery } from "../domain/entities/retrieval-query.entity";
import type { RetrievalResult } from "../domain/entities/retrieval-result.entity";

/** The retrieval abstraction the whole package is built around — a
 * future embedding/vector-backed retriever (see `VectorStore` below)
 * implements this exact interface; `KeywordRetriever` is the real,
 * provider-independent baseline this package ships. */
export interface Retriever {
  retrieve(query: RetrievalQuery): Promise<readonly RetrievalResult[]>;
}
