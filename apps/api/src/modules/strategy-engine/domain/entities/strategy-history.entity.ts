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
export type StrategyHistoryAction =
  | "STRATEGY_CREATED"
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
