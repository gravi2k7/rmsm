/**
 * Domain event contracts — the exact 6 named in this project's own
 * master prompt: StrategyCreated, StrategyUpdated, StrategyValidated,
 * StrategyPublished, StrategyArchived, StrategyVersionCreated. Real
 * shapes, following "RMSM Event Standards" as this project's own
 * established convention has consistently applied it: every event
 * carries enough identity/context to be independently meaningful (not
 * just "something changed"), an `occurredAt` timestamp, and the
 * `organizationId` every AI-103 event must carry (unlike AI-101/AI-102,
 * whose own event contracts — `GraphEvent`, `ServiceEvent`,
 * `ExecutionEvent` — deliberately have no such field, since neither of
 * those modules has organization-scoped data at all). No event bus
 * exists yet — these are contracts a real publishing mechanism
 * (Milestone 3+) will use, the same "real interface, no implementation
 * yet" discipline this project's own extension-point files have used
 * throughout (AI-102 Phase 2B/2C/3/5's own extension-points files are
 * the direct precedent).
 */

export interface StrategyDomainEventBase {
  organizationId: string;
  strategyId: string;
  actorId: string | null;
  occurredAt: Date;
}

export interface StrategyCreatedEvent extends StrategyDomainEventBase {
  kind: "StrategyCreated";
  name: string;
  category: string;
}

export interface StrategyUpdatedEvent extends StrategyDomainEventBase {
  kind: "StrategyUpdated";
  changedFields: string[];
}

export interface StrategyValidatedEvent extends StrategyDomainEventBase {
  kind: "StrategyValidated";
  strategyVersionId: string;
  passed: boolean;
  findingCount: number;
}

export interface StrategyPublishedEvent extends StrategyDomainEventBase {
  kind: "StrategyPublished";
  strategyVersionId: string;
  versionNumber: number;
  supersedesVersionId: string | null;
}

export interface StrategyArchivedEvent extends StrategyDomainEventBase {
  kind: "StrategyArchived";
}

export interface StrategyVersionCreatedEvent extends StrategyDomainEventBase {
  kind: "StrategyVersionCreated";
  strategyVersionId: string;
  versionNumber: number;
}

export type StrategyDomainEvent =
  | StrategyCreatedEvent
  | StrategyUpdatedEvent
  | StrategyValidatedEvent
  | StrategyPublishedEvent
  | StrategyArchivedEvent
  | StrategyVersionCreatedEvent;
