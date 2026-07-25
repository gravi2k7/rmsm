import type { Feedback } from "../domain/entities/feedback.entity";

export interface FeedbackRepository {
  save(feedback: Feedback): Promise<void>;
  listBySubject(subjectId: string): Promise<readonly Feedback[]>;
}
