import type { EmbeddingProvider } from "../repositories/embedding-provider.interface";
import type { EmbeddingVector } from "../domain/entities/embedding-vector.entity";
import { EmptyTextError } from "../domain/errors/embedding-domain.errors";

const DEFAULT_DIMENSIONS = 32;

function tokenize(text: string): readonly string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/** A deterministic hash: sums character codes of each token into a
 * bucket (`token hash % dimensions`), producing a stable, real
 * (non-random, non-stubbed) bag-of-words vector — no ML model, no
 * external API, but genuinely a function of the text's content, so
 * similar texts really do produce similar vectors. */
function hashToken(token: string, dimensions: number): number {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
  }
  return hash % dimensions;
}

/**
 * The real, default `EmbeddingProvider` — no ML model or external API
 * dependency anywhere (per "no provider-specific implementation"). A
 * real OpenAI/Cohere/etc. embedding adapter is a future package's
 * concern, implementing this same interface.
 */
export class HashEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions: number;

  constructor(dimensions: number = DEFAULT_DIMENSIONS) {
    this.dimensions = dimensions;
  }

  async embed(texts: readonly string[]): Promise<readonly EmbeddingVector[]> {
    return texts.map((text) => this.embedOne(text));
  }

  private embedOne(text: string): EmbeddingVector {
    if (!text.trim()) {
      throw new EmptyTextError();
    }
    const values = new Array(this.dimensions).fill(0);
    for (const token of tokenize(text)) {
      values[hashToken(token, this.dimensions)] += 1;
    }
    const magnitude = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0)) || 1;
    return { values: values.map((v) => v / magnitude), dimensions: this.dimensions };
  }
}
