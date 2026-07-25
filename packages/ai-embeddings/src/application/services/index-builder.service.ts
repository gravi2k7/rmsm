import type { IdGenerator, Clock } from "@rmsm/core";
import type { EmbeddingProvider } from "../../repositories/embedding-provider.interface";
import type { EmbeddingCache } from "../../repositories/embedding-cache.interface";
import type { VectorIndexProvider } from "../../repositories/vector-index-provider.interface";
import type { IndexEntry } from "../../domain/entities/index-entry.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { EmbeddingsComputedEvent, IndexUpdatedEvent } from "../../events/embedding-domain-events.interface";

export interface IndexableItem {
  readonly id: string;
  readonly text: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Embeds a batch of items and upserts them into a `VectorIndexProvider`
 * — checking the injected `EmbeddingCache` first for each text so
 * previously-embedded content is never recomputed. Cache and index are
 * both ports: swap `InMemoryEmbeddingCache`/`InMemoryVectorIndex` for
 * durable/external implementations without touching this class.
 */
export class IndexBuilder {
  constructor(
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly cache: EmbeddingCache,
    private readonly vectorIndex: VectorIndexProvider,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async build(items: readonly IndexableItem[]): Promise<void> {
    let cacheHits = 0;
    const entries: IndexEntry[] = [];
    const toEmbed: IndexableItem[] = [];

    for (const item of items) {
      const cached = await this.cache.get(item.text);
      if (cached) {
        cacheHits += 1;
        entries.push({ id: item.id, text: item.text, vector: cached, metadata: item.metadata });
      } else {
        toEmbed.push(item);
      }
    }

    if (toEmbed.length > 0) {
      const vectors = await this.embeddingProvider.embed(toEmbed.map((item) => item.text));
      for (let i = 0; i < toEmbed.length; i++) {
        const item = toEmbed[i]!;
        const vector = vectors[i]!;
        await this.cache.set(item.text, vector);
        entries.push({ id: item.id, text: item.text, vector, metadata: item.metadata });
      }
    }

    await this.vectorIndex.upsert(entries);

    if (this.eventPublisher) {
      const computed: EmbeddingsComputedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "EmbeddingsComputed",
        occurredAt: this.clock.now(),
        aggregateId: this.idGenerator.generate(),
        textCount: items.length,
        cacheHits,
      };
      const updated: IndexUpdatedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "IndexUpdated",
        occurredAt: this.clock.now(),
        aggregateId: this.idGenerator.generate(),
        entryCount: entries.length,
      };
      await this.eventPublisher.publish([computed, updated]);
    }
  }
}
