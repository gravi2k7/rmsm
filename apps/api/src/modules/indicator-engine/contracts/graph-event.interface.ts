/**
 * Event contracts only (item 11 — "no event bus"). Real shapes,
 * nothing publishes them yet — the identical honest scoping as Phase
 * 2B's `ExecutionEvent` (contracts/execution-event.interface.ts).
 */
export interface GraphEventBase {
  graphId: string;
  occurredAt: Date;
}

export interface GraphCreatedEvent extends GraphEventBase {
  kind: "GraphCreated";
  nodeCount: number;
}
export interface GraphValidatedEvent extends GraphEventBase {
  kind: "GraphValidated";
}
export interface GraphRejectedEvent extends GraphEventBase {
  kind: "GraphRejected";
  errorCode: string;
}
export interface ExecutionPlanGeneratedEvent extends GraphEventBase {
  kind: "ExecutionPlanGenerated";
  planId: string;
}
export interface DependencyResolvedEvent extends GraphEventBase {
  kind: "DependencyResolved";
  identifier: string;
}
export interface CycleDetectedEvent extends GraphEventBase {
  kind: "CycleDetected";
  cycle: string[];
}

export type GraphEvent =
  | GraphCreatedEvent
  | GraphValidatedEvent
  | GraphRejectedEvent
  | ExecutionPlanGeneratedEvent
  | DependencyResolvedEvent
  | CycleDetectedEvent;
