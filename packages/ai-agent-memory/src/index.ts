// AI-403: Agent Memory Integration — the sole seam between the AI-401
// Agent Framework and the AI-203 Memory Platform. Integrates ONLY with
// @rmsm/ai-memory for memory persistence/retrieval/context-assembly;
// no other AI-2xx/3xx package is depended on here.

export type { SessionIdResolver } from "./repositories/session-id-resolver.interface";

export type { AssembledAgentContext } from "./domain/entities/assembled-agent-context.entity";
export { InvalidMemoryKeyError, InvalidAgentSessionError } from "./domain/errors/agent-memory-domain.errors";

export type {
  AgentMemoryDomainEvent,
  ConversationTurnRecordedEvent,
  WorkingMemoryStoredEvent,
  LongTermMemoryStoredEvent,
  AgentContextAssembledEvent,
  AgentSessionSummarizedEvent,
} from "./events/agent-memory-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

export { AgentMemoryService } from "./application/services/agent-memory.service";

export { IdentitySessionIdResolver } from "./infrastructure/identity-session-id.resolver";
export { InMemoryEventPublisher } from "./infrastructure/in-memory-event-publisher";
