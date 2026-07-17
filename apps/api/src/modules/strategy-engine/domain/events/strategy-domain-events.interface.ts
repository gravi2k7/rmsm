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

/**
 * Milestone 4 additions — additive only, matching the exact precedent
 * Milestone 3 already established for `STRATEGY_UPDATED`
 * (`strategy-history.entity.ts`'s own comment): every event above this
 * line is byte-for-byte unchanged from Milestone 1. This milestone's
 * own master prompt names 15 domain events; 2 of them are real,
 * deliberately NOT added here:
 *
 * - `StrategyDeletedEvent` — `ArchiveStrategyHandler` (Milestone 3)
 *   already covers "DeleteStrategy" (the domain has no hard-delete
 *   method at all); a real delete never happens, so a real
 *   `StrategyDeletedEvent` would have nothing honest to describe.
 *   `StrategyArchivedEvent` (above) is the real event this maps to.
 * - `StrategyRestoredEvent` — the domain's own `Strategy` aggregate has
 *   NO restore/unarchive method; `archive()` is a genuinely terminal
 *   transition (`strategy.aggregate.ts`'s own `assertActive()` check).
 *   Adding a restore CAPABILITY would be a real domain change, out of
 *   this milestone's own explicit scope ("do NOT redesign any
 *   completed milestone"). A `StrategyRestoredEvent` contract with no
 *   operation that could ever fire it would be fiction, not a real
 *   gap worth naming — omitted entirely rather than declared unused.
 */
export interface StrategyClonedEvent extends StrategyDomainEventBase {
  kind: "StrategyCloned";
  sourceStrategyId: string;
}

export interface StrategyApprovedEvent extends StrategyDomainEventBase {
  kind: "StrategyApproved";
  strategyVersionId: string;
  approvalId: string;
  decidedByUserId: string;
}

export interface StrategyRejectedEvent extends StrategyDomainEventBase {
  kind: "StrategyRejected";
  strategyVersionId: string;
  approvalId: string;
  decidedByUserId: string;
  comments?: string;
}

/** Fired alongside `StrategyPublishedEvent` from the same `PublishVersionHandler` call — the strategy-level and version-level views of the identical real event, matching the dual-endpoint precedent Milestone 3 already established for publishing. */
export interface StrategyVersionPublishedEvent extends StrategyDomainEventBase {
  kind: "StrategyVersionPublished";
  strategyVersionId: string;
  versionNumber: number;
  supersedesVersionId: string | null;
}

export interface StrategyVersionRolledBackEvent extends StrategyDomainEventBase {
  kind: "StrategyVersionRolledBack";
  newVersionId: string;
  newVersionNumber: number;
  rolledBackFromVersionId: string;
}

/** Real event TYPES — no command handler creates/updates an ExecutionProfile yet (a real, already-existing gap since Milestone 3, which built `ExecutionProfileRepository` but never the corresponding command handlers). Declared here as real, ready contracts; nothing in this codebase publishes them yet, the same "contract before implementation" discipline this project has used since AI-102's own Phase 1. */
export interface ExecutionProfileCreatedEvent extends StrategyDomainEventBase {
  kind: "ExecutionProfileCreated";
  strategyVersionId: string;
  executionProfileId: string;
  name: string;
}

export interface ExecutionProfileUpdatedEvent extends StrategyDomainEventBase {
  kind: "ExecutionProfileUpdated";
  strategyVersionId: string;
  executionProfileId: string;
}

export type StrategyDomainEvent =
  | StrategyCreatedEvent
  | StrategyUpdatedEvent
  | StrategyValidatedEvent
  | StrategyPublishedEvent
  | StrategyArchivedEvent
  | StrategyVersionCreatedEvent
  | StrategyClonedEvent
  | StrategyApprovedEvent
  | StrategyRejectedEvent
  | StrategyVersionPublishedEvent
  | StrategyVersionRolledBackEvent
  | ExecutionProfileCreatedEvent
  | ExecutionProfileUpdatedEvent;
