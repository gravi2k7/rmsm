import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { InvalidRiskProfileError } from "../errors/strategy.errors";

export type RiskTolerance = "LOW" | "MEDIUM" | "HIGH";

interface RiskProfileProps {
  readonly tolerance: RiskTolerance;
  /** Maximum fraction of account equity a single position may risk —
   * e.g. `0.02` for 2%. */
  readonly maxRiskPerTrade: number;
  readonly maxLeverage: number;
  readonly maxOpenPositions: number;
}

/** A strategy's own risk posture — deliberately declared per-strategy,
 * not inherited from some global platform default, so two strategies
 * can run side by side with genuinely different risk appetites. Actual
 * risk *enforcement* against these bounds is `@rmsm/decision`'s job, not
 * this domain's — a `RiskProfile` is a declared intent, checked
 * elsewhere. */
export class RiskProfile extends ValueObject<RiskProfileProps> {
  private constructor(props: RiskProfileProps) {
    super(props);
  }

  static create(props: RiskProfileProps): Result<RiskProfile, InvalidRiskProfileError> {
    if (props.maxRiskPerTrade <= 0 || props.maxRiskPerTrade > 1) {
      return err(new InvalidRiskProfileError("maxRiskPerTrade must be between 0 (exclusive) and 1 (inclusive)."));
    }
    if (props.maxLeverage <= 0) {
      return err(new InvalidRiskProfileError("maxLeverage must be positive."));
    }
    if (!Number.isInteger(props.maxOpenPositions) || props.maxOpenPositions < 1) {
      return err(new InvalidRiskProfileError("maxOpenPositions must be a positive integer."));
    }
    return ok(new RiskProfile(props));
  }

  static conservative(): RiskProfile {
    return new RiskProfile({ tolerance: "LOW", maxRiskPerTrade: 0.01, maxLeverage: 2, maxOpenPositions: 3 });
  }

  get tolerance(): RiskTolerance {
    return this.props.tolerance;
  }

  get maxRiskPerTrade(): number {
    return this.props.maxRiskPerTrade;
  }

  get maxLeverage(): number {
    return this.props.maxLeverage;
  }

  get maxOpenPositions(): number {
    return this.props.maxOpenPositions;
  }
}
