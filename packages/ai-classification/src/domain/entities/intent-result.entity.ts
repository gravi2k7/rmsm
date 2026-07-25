import type { ClassificationLabel } from "./classification-label.entity";

export interface IntentResult {
  readonly intent: string;
  readonly confidence: number;
  readonly alternatives: readonly ClassificationLabel[];
}
