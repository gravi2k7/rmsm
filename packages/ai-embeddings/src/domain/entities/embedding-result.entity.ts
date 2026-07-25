import type { EmbeddingVector } from "./embedding-vector.entity";

export interface EmbeddingResult {
  readonly text: string;
  readonly vector: EmbeddingVector;
}
