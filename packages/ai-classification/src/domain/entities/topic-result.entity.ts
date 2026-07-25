import type { ClassificationLabel } from "./classification-label.entity";

export interface TopicResult {
  readonly topics: readonly ClassificationLabel[];
}
