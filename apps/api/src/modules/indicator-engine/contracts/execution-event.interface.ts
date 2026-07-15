import type { IndicatorLifecycleState } from "./indicator-lifecycle.interface";

/**
 * Event contracts only (item 11 — "no event bus, no messaging"). These
 * shapes exist so `ComputationEngine`'s real implementation (this
 * phase) has something concrete to construct at each lifecycle
 * transition, even though nothing this phase actually publishes them
 * anywhere (no `EventEmitter`, no message queue — that wiring is a
 * real, named Phase 2C+ follow-up, not attempted here as a partial,
 * unused implementation).
 */
export interface ExecutionEventBase {
  executionId: string;
  occurredAt: Date;
}

export interface ExecutionStartedEvent extends ExecutionEventBase {
  kind: "ExecutionStarted";
  indicatorIdentifier: string;
}
export interface ExecutionValidatedEvent extends ExecutionEventBase {
  kind: "ExecutionValidated";
}
export interface ExecutionCompletedEvent extends ExecutionEventBase {
  kind: "ExecutionCompleted";
  durationMs: number;
}
export interface ExecutionFailedEvent extends ExecutionEventBase {
  kind: "ExecutionFailed";
  errorCode: string;
  errorMessage: string;
}
export interface ExecutionCancelledEvent extends ExecutionEventBase {
  kind: "ExecutionCancelled";
}

export type ExecutionEvent = ExecutionStartedEvent | ExecutionValidatedEvent | ExecutionCompletedEvent | ExecutionFailedEvent | ExecutionCancelledEvent;

/** Maps each event kind to the lifecycle state it corresponds to — a real, checkable correspondence table, not just prose implying the two concepts (lifecycle state, item 4; events, item 11) line up. */
export const EVENT_TO_LIFECYCLE_STATE: Record<ExecutionEvent["kind"], IndicatorLifecycleState> = {
  ExecutionStarted: "EXECUTING",
  ExecutionValidated: "VALIDATED",
  ExecutionCompleted: "COMPLETED",
  ExecutionFailed: "FAILED",
  ExecutionCancelled: "CANCELLED",
};
