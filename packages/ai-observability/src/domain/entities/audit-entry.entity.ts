/** A durable, human-readable record of one notable thing that happened
 * to a request — the append-only audit trail `AuditService` builds up,
 * independent of (and coarser-grained than) the structured traces/metrics. */
export interface AuditEntry {
  readonly id: string;
  readonly requestId: string;
  readonly action: string;
  readonly detail: string;
  readonly occurredAt: Date;
}
