import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { InvalidRiskAssessmentError } from "../errors/decision.errors";

interface RiskScoreProps {
  readonly value: number;
}

/** A 0-100 risk score — 0 is risk-free (never actually achieved in
 * practice), 100 is maximally risky. Higher is worse, the opposite
 * convention from `Confidence` in `@rmsm/opportunity` (higher is
 * better) — deliberately, since "risk" and "confidence" are inverse
 * concepts and conflating their conventions would invite sign errors at
 * every call site that touches both. */
export class RiskScore extends ValueObject<RiskScoreProps> {
  private constructor(value: number) {
    super({ value });
  }

  static create(value: number): Result<RiskScore, InvalidRiskAssessmentError> {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      return err(new InvalidRiskAssessmentError("risk score must be a finite number between 0 and 100."));
    }
    return ok(new RiskScore(value));
  }

  get value(): number {
    return this.props.value;
  }

  isAcceptable(threshold = 70): boolean {
    return this.props.value <= threshold;
  }
}
