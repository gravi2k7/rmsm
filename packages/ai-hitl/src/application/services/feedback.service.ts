import type { Clock, IdGenerator } from "@rmsm/core";
import type { FeedbackRepository } from "../../repositories/feedback-repository.interface";
import type { Feedback } from "../../domain/entities/feedback.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { FeedbackSubmittedEvent } from "../../events/hitl-domain-events.interface";

export class FeedbackService {
  constructor(
    private readonly feedbackRepository: FeedbackRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async submit(subjectId: string, agentId: string, submittedBy: string, rating?: number, comment?: string): Promise<Feedback> {
    const feedback: Feedback = { id: this.idGenerator.generate(), subjectId, agentId, submittedBy, rating, comment, submittedAt: this.clock.now() };
    await this.feedbackRepository.save(feedback);

    const event: FeedbackSubmittedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "FeedbackSubmitted",
      occurredAt: feedback.submittedAt,
      aggregateId: feedback.id,
      feedbackId: feedback.id,
      subjectId,
    };
    if (this.eventPublisher) {
      await this.eventPublisher.publish([event]);
    }

    return feedback;
  }

  async listForSubject(subjectId: string): Promise<readonly Feedback[]> {
    return this.feedbackRepository.listBySubject(subjectId);
  }
}
