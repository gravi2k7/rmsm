import type { IdGenerator, Clock } from "@rmsm/core";
import type { EmbeddingProvider } from "../../repositories/embedding-provider.interface";
import type { EmbeddingCache } from "../../repositories/embedding-cache.interface";
import type { VectorIndexProvider } from "../../repositories/vector-index-provider.interface";
import type { SemanticSearchResult } from "../../domain/entities/semantic-search-result.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { SemanticSearchCompletedEvent } from "../../events/embedding-domain-events.interface";

/** Embeds a query (checking the cache first, same as `IndexBuilder`)
 * and searches the `VectorIndexProvider` for the most similar indexed
 * entries — the package's "semantic search interfaces" capability. */
export class SemanticSearchService {
  constructor(
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly cache: EmbeddingCache,
    private readonly vectorIndex: VectorIndexProvider,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async search(queryText: string, topK: number): Promise<readonly SemanticSearchResult[]> {
    let vector = await this.cache.get(queryText);
    if (!vector) {
      const [embedded] = await this.embeddingProvider.embed([queryText]);
      vector = embedded!;
      await this.cache.set(queryText, vector);
    }

    const results = await this.vectorIndex.search(vector, topK);

    if (this.eventPublisher) {
      const event: SemanticSearchCompletedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "SemanticSearchCompleted",
        occurredAt: this.clock.now(),
        aggregateId: this.idGenerator.generate(),
        queryText,
        resultCount: results.length,
      };
      await this.eventPublisher.publish([event]);
    }

    return results;
  }
}
