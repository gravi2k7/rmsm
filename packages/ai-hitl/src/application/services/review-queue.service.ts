import type { ApprovalRequestRepository } from "../../repositories/approval-request-repository.interface";
import type { ApprovalRequest } from "../../domain/entities/approval-request.entity";
import { ApprovalStatus } from "../../domain/enums/hitl.enum";

/** The "review queues" capability: lists everything waiting on a
 * specific reviewer team's attention. Deliberately a thin read-side
 * service over `ApprovalRequestRepository` — it never mutates a
 * request; `ApprovalService` owns every state transition. */
export class ReviewQueueService {
  constructor(private readonly requestRepository: ApprovalRequestRepository) {}

  async listPending(queueName: string): Promise<readonly ApprovalRequest[]> {
    return this.requestRepository.listByQueue(queueName, ApprovalStatus.PENDING);
  }

  async listEscalated(queueName: string): Promise<readonly ApprovalRequest[]> {
    return this.requestRepository.listByQueue(queueName, ApprovalStatus.ESCALATED);
  }
}
