// @rmsm/ai-embeddings public API (AI-305 Embedding Platform)

// Domain: entities
export type { EmbeddingVector } from "./domain/entities/embedding-vector.entity";
export type { EmbeddingResult } from "./domain/entities/embedding-result.entity";
export type { IndexEntry } from "./domain/entities/index-entry.entity";
export type { SemanticSearchResult } from "./domain/entities/semantic-search-result.entity";

// Domain: errors
export {
  EmptyTextError,
  EmbeddingDimensionMismatchError,
  IndexEntryNotFoundError,
} from "./domain/errors/embedding-domain.errors";

// Ports
export type { EmbeddingProvider } from "./repositories/embedding-provider.interface";
export type { EmbeddingCache } from "./repositories/embedding-cache.interface";
export type { VectorIndexProvider } from "./repositories/vector-index-provider.interface";

// Events
export type {
  EmbeddingsComputedEvent,
  IndexUpdatedEvent,
  SemanticSearchCompletedEvent,
  EmbeddingDomainEvent,
} from "./events/embedding-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

// Application
export { IndexBuilder, type IndexableItem } from "./application/services/index-builder.service";
export { SemanticSearchService } from "./application/services/semantic-search.service";

// Infrastructure
export { HashEmbeddingProvider } from "./infrastructure/hash-embedding.provider";
export { InMemoryVectorIndex } from "./infrastructure/in-memory-vector-index";
export { InMemoryEmbeddingCache } from "./infrastructure/in-memory-embedding.cache";
export { InMemoryEventPublisher, type EmbeddingEventListener } from "./infrastructure/in-memory-event-publisher";
