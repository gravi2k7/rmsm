import type { EmbeddingVector } from "../domain/entities/embedding-vector.entity";

export interface EmbeddingCache {
  get(text: string): Promise<EmbeddingVector | null>;
  set(text: string, vector: EmbeddingVector): Promise<void>;
}
