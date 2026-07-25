import type { FeedbackRepository } from "../repositories/feedback-repository.interface";
import type { Feedback } from "../domain/entities/feedback.entity";

export class InMemoryFeedbackRepository implements FeedbackRepository {
  private readonly items: Feedback[] = [];

  async save(feedback: Feedback): Promise<void> {
    this.items.push(feedback);
  }

  async listBySubject(subjectId: string): Promise<readonly Feedback[]> {
    return this.items.filter((f) => f.subjectId === subjectId);
  }
}
