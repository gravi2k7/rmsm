import type { EmbeddingVector } from "./embedding-vector.entity";

/** One embedded, indexed item — the unit `IndexBuilder` writes and
 * `SemanticSearchService` searches over. */
export interface IndexEntry {
  readonly id: string;
  readonly text: string;
  readonly vector: EmbeddingVector;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
