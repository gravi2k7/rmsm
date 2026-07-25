/** The "audit integration" capability's unit of record — written by
 * `AuthorizationService` on every `authorize()` call, allow or deny.
 * Deliberately its own append-only port (`AuditRepository`) rather
 * than a hard dependency on `@rmsm/ai-observability`: a caller who
 * wants these entries mirrored into AI-204's tracing can write a thin
 * `AuditRepository` adapter that also calls into AI-204, the same
 * pattern `MemoryEventTracingAdapter` used to observe AI-203 without
 * AI-203 depending on AI-204. */
export interface AuditEntry {
  readonly id: string;
  readonly actorId: string;
  readonly action: string;
  readonly resource: string;
  readonly decision: "ALLOW" | "DENY";
  readonly reason: string;
  readonly occurredAt: Date;
}
