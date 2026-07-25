import type { EmbeddingCache } from "../repositories/embedding-cache.interface";
import type { EmbeddingVector } from "../domain/entities/embedding-vector.entity";

export class InMemoryEmbeddingCache implements EmbeddingCache {
  private readonly cache = new Map<string, EmbeddingVector>();

  async get(text: string): Promise<EmbeddingVector | null> {
    return this.cache.get(text) ?? null;
  }

  async set(text: string, vector: EmbeddingVector): Promise<void> {
    this.cache.set(text, vector);
  }

  size(): number {
    return this.cache.size;
  }
}
