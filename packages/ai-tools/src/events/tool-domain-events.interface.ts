import type { DomainEvent } from "@rmsm/core";

export interface ToolInvokedEvent extends DomainEvent {
  readonly kind: "ToolInvoked";
  readonly invocationId: string;
  readonly toolName: string;
}

export interface ToolSucceededEvent extends DomainEvent {
  readonly kind: "ToolSucceeded";
  readonly invocationId: string;
  readonly toolName: string;
  readonly durationMs: number;
}

export interface ToolFailedEvent extends DomainEvent {
  readonly kind: "ToolFailed";
  readonly invocationId: string;
  readonly toolName: string;
  readonly error: string;
}

export interface ToolPermissionDeniedEvent extends DomainEvent {
  readonly kind: "ToolPermissionDenied";
  readonly invocationId: string;
  readonly toolName: string;
  readonly missingPermissions: readonly string[];
}

export interface ToolTimedOutEvent extends DomainEvent {
  readonly kind: "ToolTimedOut";
  readonly invocationId: string;
  readonly toolName: string;
}

export type ToolDomainEvent =
  | ToolInvokedEvent
  | ToolSucceededEvent
  | ToolFailedEvent
  | ToolPermissionDeniedEvent
  | ToolTimedOutEvent;
