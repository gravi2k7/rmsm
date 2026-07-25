import type { DomainEvent } from "@rmsm/core";

export interface ConversationTurnRecordedEvent extends DomainEvent {
  readonly kind: "ConversationTurnRecorded";
  readonly agentId: string;
  readonly sessionId: string;
}

export interface WorkingMemoryStoredEvent extends DomainEvent {
  readonly kind: "WorkingMemoryStored";
  readonly agentId: string;
  readonly key: string;
}

export interface LongTermMemoryStoredEvent extends DomainEvent {
  readonly kind: "LongTermMemoryStored";
  readonly agentId: string;
  readonly memoryEntryId: string;
}

export interface AgentContextAssembledEvent extends DomainEvent {
  readonly kind: "AgentContextAssembled";
  readonly agentId: string;
  readonly sessionId: string;
  readonly sourceEntryCount: number;
}

export interface AgentSessionSummarizedEvent extends DomainEvent {
  readonly kind: "AgentSessionSummarized";
  readonly agentId: string;
  readonly sessionId: string;
}

export type AgentMemoryDomainEvent =
  | ConversationTurnRecordedEvent
  | WorkingMemoryStoredEvent
  | LongTermMemoryStoredEvent
  | AgentContextAssembledEvent
  | AgentSessionSummarizedEvent;
