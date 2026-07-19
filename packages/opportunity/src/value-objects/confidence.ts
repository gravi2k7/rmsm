import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { InvalidConfidenceError } from "../errors/opportunity.errors";

interface ConfidenceProps {
  readonly score: number;
}

/** A 0-100 confidence score for an opportunity — how sure the generating
 * source (a strategy, a scoring model) is that this is a genuine trade
 * opportunity, independent of how strong the underlying signal itself
 * is (see `SignalStrength`, a related but distinct concept: a strong
 * signal from a low-confidence source is still low-confidence overall). */
export class Confidence extends ValueObject<ConfidenceProps> {
  private constructor(score: number) {
    super({ score });
  }

  static create(score: number): Result<Confidence, InvalidConfidenceError> {
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return err(new InvalidConfidenceError("score must be a finite number between 0 and 100."));
    }
    return ok(new Confidence(score));
  }

  get score(): number {
    return this.props.score;
  }

  isHigh(): boolean {
    return this.props.score >= 75;
  }

  isLow(): boolean {
    return this.props.score < 40;
  }
}
