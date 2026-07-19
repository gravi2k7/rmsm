import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { InvalidSignalError } from "../errors/opportunity.errors";

export type SignalStrengthLevel = "WEAK" | "MODERATE" | "STRONG";

interface SignalStrengthProps {
  readonly level: SignalStrengthLevel;
  /** A raw 0-1 magnitude underlying `level` — e.g. how far an indicator
   * crossed its own threshold. `level` is the coarse, human-facing
   * category; `magnitude` is what `ScoringService` actually computes
   * with. */
  readonly magnitude: number;
}

const LEVEL_THRESHOLDS: Readonly<Record<SignalStrengthLevel, [number, number]>> = {
  WEAK: [0, 0.34],
  MODERATE: [0.34, 0.67],
  STRONG: [0.67, 1],
};

export class SignalStrength extends ValueObject<SignalStrengthProps> {
  private constructor(level: SignalStrengthLevel, magnitude: number) {
    super({ level, magnitude });
  }

  /** Derives `level` from `magnitude` automatically — a caller supplies
   * only the raw 0-1 number, never an inconsistent level/magnitude pair. */
  static fromMagnitude(magnitude: number): Result<SignalStrength, InvalidSignalError> {
    if (!Number.isFinite(magnitude) || magnitude < 0 || magnitude > 1) {
      return err(new InvalidSignalError("magnitude must be a finite number between 0 and 1."));
    }
    const level = magnitude >= LEVEL_THRESHOLDS.STRONG[0] ? "STRONG" : magnitude >= LEVEL_THRESHOLDS.MODERATE[0] ? "MODERATE" : "WEAK";
    return ok(new SignalStrength(level, magnitude));
  }

  get level(): SignalStrengthLevel {
    return this.props.level;
  }

  get magnitude(): number {
    return this.props.magnitude;
  }
}
