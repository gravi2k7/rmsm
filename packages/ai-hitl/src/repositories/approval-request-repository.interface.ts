import type { ApprovalRequest } from "../domain/entities/approval-request.entity";
import type { ApprovalStatus } from "../domain/enums/hitl.enum";

export interface ApprovalRequestRepository {
  save(request: ApprovalRequest): Promise<void>;
  findById(id: string): Promise<ApprovalRequest | null>;
  listByQueue(queueName: string, status?: ApprovalStatus): Promise<readonly ApprovalRequest[]>;
}
