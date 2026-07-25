// AI-408: Human-in-the-Loop — approval requests, manual intervention,
// review queues, escalation, feedback, and decision recording.
// Deliberately subject/agent-representation-agnostic: no dependency on
// any other AI-2xx/3xx/4xx package, so it can gate ANY agent action a
// caller wants gated, regardless of which package produced it.

export { ApprovalStatus, APPROVAL_STATUSES, InterventionStatus, INTERVENTION_STATUSES } from "./domain/enums/hitl.enum";

export type { ApprovalRequest } from "./domain/entities/approval-request.entity";
export type { ManualIntervention } from "./domain/entities/manual-intervention.entity";
export type { Feedback } from "./domain/entities/feedback.entity";
export type { DecisionRecord } from "./domain/entities/decision-record.entity";

export {
  ApprovalRequestNotFoundError,
  ApprovalAlreadyResolvedError,
  InterventionNotFoundError,
  InterventionAlreadyResolvedError,
} from "./domain/errors/hitl-domain.errors";

export type { ApprovalRequestRepository } from "./repositories/approval-request-repository.interface";
export type { ManualInterventionRepository } from "./repositories/manual-intervention-repository.interface";
export type { FeedbackRepository } from "./repositories/feedback-repository.interface";
export type { DecisionRecordRepository } from "./repositories/decision-record-repository.interface";

export type {
  HitlDomainEvent,
  ApprovalRequestedEvent,
  ApprovalGrantedEvent,
  ApprovalRejectedEvent,
  ApprovalEscalatedEvent,
  InterventionRequestedEvent,
  InterventionResolvedEvent,
  FeedbackSubmittedEvent,
  DecisionRecordedEvent,
} from "./events/hitl-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

export { ApprovalService } from "./application/services/approval.service";
export { ReviewQueueService } from "./application/services/review-queue.service";
export { InterventionService } from "./application/services/intervention.service";
export { FeedbackService } from "./application/services/feedback.service";
export { DecisionRecordService } from "./application/services/decision-record.service";

export { InMemoryApprovalRequestRepository } from "./infrastructure/in-memory-approval-request.repository";
export { InMemoryManualInterventionRepository } from "./infrastructure/in-memory-manual-intervention.repository";
export { InMemoryFeedbackRepository } from "./infrastructure/in-memory-feedback.repository";
export { InMemoryDecisionRecordRepository } from "./infrastructure/in-memory-decision-record.repository";
export { InMemoryEventPublisher } from "./infrastructure/in-memory-event-publisher";
