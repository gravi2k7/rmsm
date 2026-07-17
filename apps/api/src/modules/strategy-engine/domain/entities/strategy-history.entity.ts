/**
 * The append-only audit trail for one `Strategy` aggregate — item
 * "Audit History," made concrete as real, structured, queryable
 * entries (not a free-text log). Every real state transition this
 * domain model can produce gets its own `StrategyHistoryEntry` —
 * created, a new version drafted, validated, approved, rejected,
 * published, archived — mirroring the exact discipline AI-101's own
 * `AuditService` established platform-wide (every mutation gets a
 * real audit record, `actorId: string | null` for system-initiated
 * actions, never a fake placeholder string).
 */
/**
 * The append-only audit trail for one `Strategy` aggregate — item
 * "Audit History," made concrete as real, structured, queryable
 * entries (not a free-text log). Every real state transition this
 * domain model can produce gets its own `StrategyHistoryEntry` —
 * created, a new version drafted, validated, approved, rejected,
 * published, archived — mirroring the exact discipline AI-101's own
 * `AuditService` established platform-wide (every mutation gets a
 * real audit record, `actorId: string | null` for system-initiated
 * actions, never a fake placeholder string).
 *
 * `STRATEGY_UPDATED` — Milestone 3 addition. A real, small gap found
 * while implementing the explicitly-named `UpdateStrategy` use case:
 * this file's own domain events (`strategy-domain-events.interface.ts`)
 * already had `StrategyUpdatedEvent` since Milestone 1, but this
 * SEPARATE audit-trail enum never got the matching value — an
 * inconsistency between two related domain concepts, not a design
 * decision. Adding one new union member is additive (nothing existing
 * changes shape or meaning), not a restructuring — the minimal fix
 * needed to correctly audit a use case this milestone's own scope
 * explicitly names, not a domain redesign.
 */
export type StrategyHistoryAction =
  | "STRATEGY_CREATED"
  | "STRATEGY_UPDATED"
  | "VERSION_DRAFTED"
  | "VERSION_VALIDATED"
  | "VERSION_APPROVAL_REQUESTED"
  | "VERSION_APPROVED"
  | "VERSION_REJECTED"
  | "VERSION_PUBLISHED"
  | "STRATEGY_ARCHIVED";

export class StrategyHistoryEntry {
  constructor(
    public readonly id: string,
    public readonly strategyId: string,
    public readonly action: StrategyHistoryAction,
    public readonly actorId: string | null,
    public readonly occurredAt: Date,
    public readonly metadata: Record<string, unknown>,
  ) {}
}
