import type { AIRequestStatus } from "../enums/observability.enum";

/**
 * The root record for one end-to-end AI operation (prompt render +
 * memory load + provider call). Plain data, not an `AggregateRoot` —
 * AI-204 records what happened rather than modeling behavior that
 * raises its own domain events; the events it *does* care about are
 * the ones AI-201/202/203 publish, which `TracingService` consumes.
 */
export interface AIRequest {
  readonly id: string;
  readonly organizationId: string | null;
  readonly status: AIRequestStatus;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
}
