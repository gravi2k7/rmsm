// @rmsm/ai-rag public API (AI-304 Knowledge Retrieval / RAG)

// Domain: entities
export type { RetrievableChunk } from "./domain/entities/retrievable-chunk.entity";
export type { RetrievalQuery } from "./domain/entities/retrieval-query.entity";
export type { RetrievalResult } from "./domain/entities/retrieval-result.entity";
export type { RetrievalContext } from "./domain/entities/retrieval-context.entity";

// Domain: errors
export { EmptyIndexError, InvalidRetrievalQueryError } from "./domain/errors/rag-domain.errors";

// Ports
export type { Retriever } from "./repositories/retriever.interface";
export type { VectorStore } from "./repositories/vector-store.interface";

// Events
export type {
  ChunksIndexedEvent,
  RetrievalCompletedEvent,
  ContextBuiltEvent,
  RagDomainEvent,
} from "./events/rag-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

// Application
export { RetrieverPipeline } from "./application/services/retriever-pipeline.service";
export { ContextBuilder } from "./application/services/context-builder.service";

// Infrastructure
export { KeywordRetriever } from "./infrastructure/keyword.retriever";
export { InMemoryEventPublisher, type RagEventListener } from "./infrastructure/in-memory-event-publisher";
