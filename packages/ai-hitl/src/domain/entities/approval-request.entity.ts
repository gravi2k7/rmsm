import type { ApprovalStatus } from "../enums/hitl.enum";

/** The "approval requests" + "review queues" capabilities' unit of
 * record: one thing an agent wants to do that a human must sign off
 * on before it proceeds. `queueName` groups requests for the reviewer
 * team responsible for them — `ReviewQueueService` lists PENDING
 * requests scoped to one queue. */
export interface ApprovalRequest {
  readonly id: string;
  readonly agentId: string;
  readonly queueName: string;
  readonly subject: string;
  readonly context: unknown;
  readonly status: ApprovalStatus;
  readonly resolvedBy?: string;
  readonly resolutionReason?: string;
  readonly escalatedTo?: string;
  readonly requestedAt: Date;
  readonly resolvedAt: Date | null;
}
