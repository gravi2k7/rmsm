import type { DomainEvent } from "@rmsm/core";

export interface ChatSessionStartedEvent extends DomainEvent {
  readonly kind: "ChatSessionStarted";
  readonly sessionId: string;
}

export interface ChatMessageSentEvent extends DomainEvent {
  readonly kind: "ChatMessageSent";
  readonly sessionId: string;
  readonly messageId: string;
}

export interface ChatResponseCompletedEvent extends DomainEvent {
  readonly kind: "ChatResponseCompleted";
  readonly sessionId: string;
  readonly finishReason: "stop" | "tool_call" | "length";
}

export interface ToolInvokedEvent extends DomainEvent {
  readonly kind: "ToolInvoked";
  readonly sessionId: string;
  readonly toolName: string;
  readonly toolCallId: string;
}

export interface ToolCompletedEvent extends DomainEvent {
  readonly kind: "ToolCompleted";
  readonly sessionId: string;
  readonly toolName: string;
  readonly toolCallId: string;
  readonly isError: boolean;
}

export interface ChatFailedEvent extends DomainEvent {
  readonly kind: "ChatFailed";
  readonly sessionId: string;
  readonly errorMessage: string;
}

export type ChatDomainEvent =
  | ChatSessionStartedEvent
  | ChatMessageSentEvent
  | ChatResponseCompletedEvent
  | ToolInvokedEvent
  | ToolCompletedEvent
  | ChatFailedEvent;
