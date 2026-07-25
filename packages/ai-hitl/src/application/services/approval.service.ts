import type { Clock, IdGenerator } from "@rmsm/core";
import type { ApprovalRequestRepository } from "../../repositories/approval-request-repository.interface";
import type { DecisionRecordRepository } from "../../repositories/decision-record-repository.interface";
import type { ApprovalRequest } from "../../domain/entities/approval-request.entity";
import { ApprovalStatus } from "../../domain/enums/hitl.enum";
import { ApprovalRequestNotFoundError, ApprovalAlreadyResolvedError } from "../../domain/errors/hitl-domain.errors";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type {
  ApprovalRequestedEvent,
  ApprovalGrantedEvent,
  ApprovalRejectedEvent,
  ApprovalEscalatedEvent,
  DecisionRecordedEvent,
} from "../../events/hitl-domain-events.interface";

/** The "approval requests," "escalation," and (jointly with
 * `InterventionService`) "decision recording" capabilities. Every
 * resolution (`approve`/`reject`) writes an immutable
 * `DecisionRecord` alongside updating the request's own mutable
 * status — the audit trail survives even if the request itself were
 * ever further mutated. */
export class ApprovalService {
  constructor(
    private readonly requestRepository: ApprovalRequestRepository,
    private readonly decisionRepository: DecisionRecordRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async requestApproval(agentId: string, queueName: string, subject: string, context: unknown = {}): Promise<ApprovalRequest> {
    const now = this.clock.now();
    const request: ApprovalRequest = {
      id: this.idGenerator.generate(),
      agentId,
      queueName,
      subject,
      context,
      status: ApprovalStatus.PENDING,
      requestedAt: now,
      resolvedAt: null,
    };
    await this.requestRepository.save(request);

    const event: ApprovalRequestedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "ApprovalRequested",
      occurredAt: now,
      aggregateId: request.id,
      requestId: request.id,
      agentId,
      queueName,
    };
    await this.publish([event]);

    return request;
  }

  async approve(requestId: string, resolvedBy: string, reason?: string): Promise<ApprovalRequest> {
    const request = await this.getResolvable(requestId);
    const now = this.clock.now();
    const resolved: ApprovalRequest = { ...request, status: ApprovalStatus.APPROVED, resolvedBy, resolutionReason: reason, resolvedAt: now };
    await this.requestRepository.save(resolved);
    await this.recordDecision(requestId, "APPROVED", resolvedBy, reason, now);

    const event: ApprovalGrantedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "ApprovalGranted",
      occurredAt: now,
      aggregateId: requestId,
      requestId,
      resolvedBy,
    };
    await this.publish([event]);

    return resolved;
  }

  async reject(requestId: string, resolvedBy: string, reason?: string): Promise<ApprovalRequest> {
    const request = await this.getResolvable(requestId);
    const now = this.clock.now();
    const resolved: ApprovalRequest = { ...request, status: ApprovalStatus.REJECTED, resolvedBy, resolutionReason: reason, resolvedAt: now };
    await this.requestRepository.save(resolved);
    await this.recordDecision(requestId, "REJECTED", resolvedBy, reason, now);

    const event: ApprovalRejectedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "ApprovalRejected",
      occurredAt: now,
      aggregateId: requestId,
      requestId,
      resolvedBy,
    };
    await this.publish([event]);

    return resolved;
  }

  /** Escalation does NOT resolve the request — it stays actionable
   * (moved to a human/team better equipped to decide), which is why
   * `escalate` doesn't call `getResolvable`/set `resolvedAt`, unlike
   * `approve`/`reject`. */
  async escalate(requestId: string, escalatedTo: string, reason?: string): Promise<ApprovalRequest> {
    const request = await this.getRequest(requestId);
    if (request.status === ApprovalStatus.APPROVED || request.status === ApprovalStatus.REJECTED) {
      throw new ApprovalAlreadyResolvedError(requestId, request.status);
    }
    const now = this.clock.now();
    const escalated: ApprovalRequest = { ...request, status: ApprovalStatus.ESCALATED, escalatedTo };
    await this.requestRepository.save(escalated);
    await this.recordDecision(requestId, "ESCALATED", escalatedTo, reason, now);

    const event: ApprovalEscalatedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "ApprovalEscalated",
      occurredAt: now,
      aggregateId: requestId,
      requestId,
      escalatedTo,
    };
    await this.publish([event]);

    return escalated;
  }

  async getRequest(requestId: string): Promise<ApprovalRequest> {
    const request = await this.requestRepository.findById(requestId);
    if (!request) {
      throw new ApprovalRequestNotFoundError(requestId);
    }
    return request;
  }

  private async getResolvable(requestId: string): Promise<ApprovalRequest> {
    const request = await this.getRequest(requestId);
    if (request.status === ApprovalStatus.APPROVED || request.status === ApprovalStatus.REJECTED) {
      throw new ApprovalAlreadyResolvedError(requestId, request.status);
    }
    return request;
  }

  private async recordDecision(subjectId: string, decision: string, decidedBy: string, reason: string | undefined, decidedAt: Date): Promise<void> {
    const recordId = this.idGenerator.generate();
    await this.decisionRepository.save({ id: recordId, subjectType: "APPROVAL", subjectId, decision, decidedBy, reason, decidedAt });

    const event: DecisionRecordedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "DecisionRecorded",
      occurredAt: decidedAt,
      aggregateId: recordId,
      recordId,
      subjectId,
    };
    await this.publish([event]);
  }

  private async publish(
    events: readonly (ApprovalRequestedEvent | ApprovalGrantedEvent | ApprovalRejectedEvent | ApprovalEscalatedEvent | DecisionRecordedEvent)[],
  ): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
