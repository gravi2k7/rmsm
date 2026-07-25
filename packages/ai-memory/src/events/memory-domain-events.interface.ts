import type { DomainEvent } from "@rmsm/core";
import type { MemoryType, MessageRole } from "../domain/enums/memory-type.enum";

/**
 * The 6 domain events AI-203's own spec names, each extending
 * `@rmsm/core`'s `DomainEvent` (`eventId`/`kind`/`occurredAt`/
 * `aggregateId`) — the same `kind`-discriminated-union shape
 * `apps/api/.../strategy-domain-events.interface.ts` established for
 * AI-103. Plain interfaces, not classes: application-layer code
 * constructs these as object literals at the point something actually
 * happened (inside `Conversation`'s own aggregate methods, or in
 * `MemoryService`), the same split `@rmsm/core`'s own `AggregateRoot`
 * doc comment describes.
 */

export interface ConversationStartedEvent extends DomainEvent {
  readonly kind: "ConversationStarted";
  readonly conversationId: string;
  readonly organizationId: string | null;
}

export interface ConversationUpdatedEvent extends DomainEvent {
  readonly kind: "ConversationUpdated";
  readonly conversationId: string;
  readonly messageId: string;
  readonly role: MessageRole;
}

export interface MemoryStoredEvent extends DomainEvent {
  readonly kind: "MemoryStored";
  readonly memoryEntryId: string;
  readonly memoryType: MemoryType;
  readonly conversationId: string | null;
}

export interface MemorySummarizedEvent extends DomainEvent {
  readonly kind: "MemorySummarized";
  readonly summaryId: string;
  readonly sourceMemoryEntryIds: readonly string[];
}

export interface MemoryExpiredEvent extends DomainEvent {
  readonly kind: "MemoryExpired";
  readonly memoryEntryId: string;
}

export interface MemoryRetrievedEvent extends DomainEvent {
  readonly kind: "MemoryRetrieved";
  readonly memoryEntryIds: readonly string[];
  /** The query's `searchText`, if any — `null` for a structural (tag/type/conversation) query with no free-text term. Carried for AI-204 to trace what was searched for. */
  readonly searchText: string | null;
}

export type MemoryDomainEvent =
  | ConversationStartedEvent
  | ConversationUpdatedEvent
  | MemoryStoredEvent
  | MemorySummarizedEvent
  | MemoryExpiredEvent
  | MemoryRetrievedEvent;
