import type { TopicResult } from "../domain/entities/topic-result.entity";

export interface TopicClassifier {
  classify(text: string): Promise<TopicResult>;
}
