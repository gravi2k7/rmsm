// @rmsm/ai-summarization public API (AI-308 Summarization Engine)

// Domain: entities
export type { SummaryNode } from "./domain/entities/summary-node.entity";
export type { HierarchicalSummary } from "./domain/entities/hierarchical-summary.entity";
export type { RecursiveSummary } from "./domain/entities/recursive-summary.entity";

// Domain: errors
export {
  EmptyContentError,
  InvalidSummarizationOptionsError,
  SummarizationDidNotConvergeError,
} from "./domain/errors/summarization-domain.errors";

// Events
export type {
  ChunkSummarizedEvent,
  LevelSummarizedEvent,
  RecursiveSummarizationCompletedEvent,
  ConversationSummarizedEvent,
  DocumentSummarizedEvent,
  SummarizationDomainEvent,
} from "./events/summarization-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

// Application
export { RecursiveSummarizer, type RecursiveSummarizationOptions } from "./application/services/recursive-summarizer.service";
export { HierarchicalSummarizer, type HierarchicalSummarizationOptions } from "./application/services/hierarchical-summarizer.service";
export { ConversationSummarizer } from "./application/services/conversation-summarizer.service";
export { DocumentSummarizer } from "./application/services/document-summarizer.service";

// Infrastructure
export { InMemoryEventPublisher, type SummarizationEventListener } from "./infrastructure/in-memory-event-publisher";
