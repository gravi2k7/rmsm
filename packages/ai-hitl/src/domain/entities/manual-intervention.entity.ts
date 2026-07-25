import type { InterventionStatus } from "../enums/hitl.enum";

/** The "manual intervention" capability: a request for a human to step
 * in and directly resolve something an agent got stuck on — distinct
 * from an `ApprovalRequest` (which blocks a specific proposed action)
 * because an intervention doesn't propose anything; it just flags that
 * a human needs to look. */
export interface ManualIntervention {
  readonly id: string;
  readonly agentId: string;
  readonly executionId?: string;
  readonly reason: string;
  readonly status: InterventionStatus;
  readonly resolution?: string;
  readonly requestedAt: Date;
  readonly resolvedAt: Date | null;
}
