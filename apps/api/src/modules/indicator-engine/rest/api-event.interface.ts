/**
 * API event contracts (item 11 — "no event bus"). Real shapes, nothing
 * publishes them yet — the identical honest scoping as every prior
 * phase's own event contracts (Phase 2B's `ExecutionEvent`, Phase 2C's
 * `GraphEvent`, Phase 3's `ServiceEvent`). This is the 4th such
 * contract file in this module; deliberately not merged with any of
 * the earlier three — an HTTP-layer event ("a request arrived") is a
 * genuinely different concern than an execution-layer event ("an
 * execution started"), even though a real event bus (a future phase)
 * would likely need to correlate across all of them via `requestId`.
 */
export interface ApiEventBase {
  requestId: string;
  occurredAt: Date;
}

export interface ApiRequestReceivedEvent extends ApiEventBase {
  kind: "APIRequestReceived";
  method: string;
  path: string;
}
export interface ApiRequestValidatedEvent extends ApiEventBase {
  kind: "APIRequestValidated";
}
export interface ApiExecutionStartedEvent extends ApiEventBase {
  kind: "APIExecutionStarted";
  indicatorIdentifier: string;
}
export interface ApiExecutionCompletedEvent extends ApiEventBase {
  kind: "APIExecutionCompleted";
  durationMs: number;
}
export interface ApiRequestFailedEvent extends ApiEventBase {
  kind: "APIRequestFailed";
  statusCode: number;
  errorCode: string;
}

export type ApiEvent = ApiRequestReceivedEvent | ApiRequestValidatedEvent | ApiExecutionStartedEvent | ApiExecutionCompletedEvent | ApiRequestFailedEvent;
