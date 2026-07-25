import type { ApprovalRequestRepository } from "../repositories/approval-request-repository.interface";
import type { ApprovalRequest } from "../domain/entities/approval-request.entity";
import type { ApprovalStatus } from "../domain/enums/hitl.enum";

export class InMemoryApprovalRequestRepository implements ApprovalRequestRepository {
  private readonly byId = new Map<string, ApprovalRequest>();

  async save(request: ApprovalRequest): Promise<void> {
    this.byId.set(request.id, request);
  }

  async findById(id: string): Promise<ApprovalRequest | null> {
    return this.byId.get(id) ?? null;
  }

  async listByQueue(queueName: string, status?: ApprovalStatus): Promise<readonly ApprovalRequest[]> {
    return [...this.byId.values()].filter((r) => r.queueName === queueName && (!status || r.status === status));
  }
}
