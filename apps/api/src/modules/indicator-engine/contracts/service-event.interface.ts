/** Event contracts only (item 10 — "no event bus"). Real shapes, nothing publishes them yet — the identical honest scoping as Phase 2B's ExecutionEvent and Phase 2C's GraphEvent. */
export interface ServiceEventBase {
  requestId: string;
  occurredAt: Date;
}

export interface ExecutionRequestedEvent extends ServiceEventBase {
  kind: "ExecutionRequested";
  indicatorIdentifier: string;
}
export interface ExecutionStartedEvent extends ServiceEventBase {
  kind: "ExecutionStarted";
}
export interface ExecutionCompletedEvent extends ServiceEventBase {
  kind: "ExecutionCompleted";
  durationMs: number;
}
export interface ExecutionFailedEvent extends ServiceEventBase {
  kind: "ExecutionFailed";
  errorCode: string;
}
export interface ValidationCompletedEvent extends ServiceEventBase {
  kind: "ValidationCompleted";
  valid: boolean;
}
export interface RegistryQueriedEvent extends ServiceEventBase {
  kind: "RegistryQueried";
  resultCount: number;
}

export type ServiceEvent =
  | ExecutionRequestedEvent
  | ExecutionStartedEvent
  | ExecutionCompletedEvent
  | ExecutionFailedEvent
  | ValidationCompletedEvent
  | RegistryQueriedEvent;
