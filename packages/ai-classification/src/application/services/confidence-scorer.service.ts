import { InvalidConfidenceThresholdError } from "../../domain/errors/classification-domain.errors";

/** A small, shared utility for the "confidence scoring" capability —
 * every classifier in this package produces a `confidence` in [0, 1];
 * this is the one place that decides what counts as "confident enough"
 * so that policy isn't duplicated per classifier. */
export class ConfidenceScorer {
  isConfident(confidence: number, threshold: number): boolean {
    if (threshold < 0 || threshold > 1) {
      throw new InvalidConfidenceThresholdError(threshold);
    }
    return confidence >= threshold;
  }

  clamp(confidence: number): number {
    return Math.max(0, Math.min(1, confidence));
  }
}
