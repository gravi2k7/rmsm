// @rmsm/ai-memory public API
//
// Exported: domain entities/enums/errors, application services,
// repository/summarizer/vector-store ports, event shapes + the
// EventPublisher port, and the concrete infrastructure
// implementations meant for direct consumption.
//
// Not exported (infrastructure-internal): memory-entry-file.schema.ts
// (zod internals of the filesystem provider) and memory-query-filter.ts
// (a shared helper, not a public contract).

// Domain: enums
export { MemoryType, MEMORY_TYPES, MessageRole, MESSAGE_ROLES } from "./domain/enums/memory-type.enum";

// Domain: entities
export type { ConversationMessage } from "./domain/entities/conversation-message.entity";
export {
  Conversation,
  type ConversationStartParams,
  type ConversationHydrateParams,
} from "./domain/entities/conversation.entity";
export type { MemoryChunk } from "./domain/entities/memory-chunk.entity";
export type { MemoryContext } from "./domain/entities/memory-context.entity";
export type { MemoryEntry } from "./domain/entities/memory-entry.entity";
export type { MemoryMetadata } from "./domain/entities/memory-metadata.entity";
export type { MemoryQuery } from "./domain/entities/memory-query.entity";
export type { MemoryResult } from "./domain/entities/memory-result.entity";
export type { MemorySummary } from "./domain/entities/memory-summary.entity";

// Domain: errors
export {
  MemoryNotFoundError,
  ConversationNotFoundError,
  DuplicateConversationError,
  MemoryExpiredError,
  MemoryVersionConflictError,
  InvalidMemoryQueryError,
  MemoryCompressionError,
} from "./domain/errors/memory-domain.errors";

// Repositories / ports
export type { MemoryRepository } from "./repositories/memory-repository.interface";
export type { ConversationRepository } from "./repositories/conversation-repository.interface";
export type { Summarizer } from "./repositories/summarizer.interface";
export type { VectorStoreProvider } from "./repositories/vector-store-provider.interface";

// Events
export type {
  ConversationStartedEvent,
  ConversationUpdatedEvent,
  MemoryStoredEvent,
  MemorySummarizedEvent,
  MemoryExpiredEvent,
  MemoryRetrievedEvent,
  MemoryDomainEvent,
} from "./events/memory-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

// Application services
export { MemoryService, type StoreMemoryParams, type UpdateMemoryChanges } from "./application/services/memory.service";
export { ConversationService } from "./application/services/conversation.service";
export { ContextAssembler, type AssembleContextParams } from "./application/services/context-assembler.service";
export { MemoryRetriever } from "./application/services/memory-retriever.service";
export { MemorySummarizer, type SummarizeParams } from "./application/services/memory-summarizer.service";
export { MemoryCompressor, type CompressInput, type CompressOutput } from "./application/services/memory-compressor.service";
export { SystemIdGenerator } from "./application/system-id-generator";
export { estimateTokenCount } from "./application/token-estimator";

// Infrastructure: concrete adapters
export { InMemoryMemoryProvider } from "./infrastructure/in-memory-memory.provider";
export { InMemoryConversationProvider } from "./infrastructure/in-memory-conversation.provider";
export { FilesystemMemoryProvider } from "./infrastructure/filesystem-memory.provider";
export { InMemoryEventPublisher, type MemoryEventListener } from "./infrastructure/in-memory-event-publisher";
export { HeuristicSummarizer } from "./infrastructure/heuristic-summarizer.provider";
