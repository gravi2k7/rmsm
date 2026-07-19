import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { InvalidPortfolioError } from "../errors/portfolio.errors";

interface DrawdownProps {
  readonly peakEquity: number;
  readonly currentEquity: number;
}

/** How far current equity has fallen from its own historical peak —
 * computed from the two raw numbers rather than stored as a bare
 * percentage, so `percentage`/`amount` can never drift out of sync with
 * the equity values that produced them. A `Drawdown` where
 * `currentEquity >= peakEquity` is a valid, zero-drawdown state (a new
 * equity high), not an error. */
export class Drawdown extends ValueObject<DrawdownProps> {
  private constructor(peakEquity: number, currentEquity: number) {
    super({ peakEquity, currentEquity });
  }

  static create(peakEquity: number, currentEquity: number): Result<Drawdown, InvalidPortfolioError> {
    if (!Number.isFinite(peakEquity) || peakEquity <= 0) {
      return err(new InvalidPortfolioError("peakEquity must be a positive, finite number."));
    }
    if (!Number.isFinite(currentEquity) || currentEquity < 0) {
      return err(new InvalidPortfolioError("currentEquity must be a non-negative, finite number."));
    }
    return ok(new Drawdown(peakEquity, currentEquity));
  }

  get peakEquity(): number {
    return this.props.peakEquity;
  }

  get currentEquity(): number {
    return this.props.currentEquity;
  }

  /** The dollar amount below peak — `0` when at or above the peak. */
  get amount(): number {
    return Math.max(0, this.props.peakEquity - this.props.currentEquity);
  }

  /** The drawdown as a percentage of peak equity — `0` to `100`. */
  get percentage(): number {
    return (this.amount / this.props.peakEquity) * 100;
  }

  exceeds(limitPercentage: number): boolean {
    return this.percentage > limitPercentage;
  }
}
