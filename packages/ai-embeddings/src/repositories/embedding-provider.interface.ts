import type { EmbeddingVector } from "../domain/entities/embedding-vector.entity";

/**
 * The provider-independence boundary this package is built around — no
 * concrete implementation calls a real embedding API (per "no
 * provider-specific implementation"). `HashEmbeddingProvider` is the
 * only concrete implementation this package ships: a deterministic,
 * genuinely-computed (not stubbed) bag-of-words hash embedding, real
 * enough to exercise every other piece of this package (cache, index,
 * search) without any external dependency. A real OpenAI/Cohere/etc.
 * adapter is a future package's concern, implementing this interface.
 */
export interface EmbeddingProvider {
  readonly dimensions: number;
  embed(texts: readonly string[]): Promise<readonly EmbeddingVector[]>;
}
