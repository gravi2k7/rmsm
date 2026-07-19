import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { InvalidPortfolioError } from "../errors/portfolio.errors";

export type ExposureScope = "SYMBOL" | "SECTOR" | "PORTFOLIO";

interface ExposureProps {
  readonly scope: ExposureScope;
  /** The identifier this exposure is scoped to — a symbol code string
   * for `"SYMBOL"`, a sector name for `"SECTOR"`, `undefined` for the
   * portfolio-wide total. */
  readonly scopeId?: string;
  readonly amount: number;
  readonly portfolioEquity: number;
}

/** How much of the portfolio is committed to a given scope (a single
 * symbol, a sector, or the portfolio as a whole) — this domain's own
 * required Symbol Exposure / Sector Exposure / Maximum Portfolio Risk
 * features, unified under one value object parameterized by `scope`
 * rather than three separate, near-identical classes. */
export class Exposure extends ValueObject<ExposureProps> {
  private constructor(props: ExposureProps) {
    super(props);
  }

  static create(props: ExposureProps): Result<Exposure, InvalidPortfolioError> {
    if (!Number.isFinite(props.amount) || props.amount < 0) {
      return err(new InvalidPortfolioError("exposure amount must be a non-negative, finite number."));
    }
    if (!Number.isFinite(props.portfolioEquity) || props.portfolioEquity <= 0) {
      return err(new InvalidPortfolioError("portfolioEquity must be a positive, finite number."));
    }
    if (props.scope !== "PORTFOLIO" && !props.scopeId) {
      return err(new InvalidPortfolioError(`scopeId is required for scope "${props.scope}".`));
    }
    return ok(new Exposure(props));
  }

  get scope(): ExposureScope {
    return this.props.scope;
  }

  get scopeId(): string | undefined {
    return this.props.scopeId;
  }

  get amount(): number {
    return this.props.amount;
  }

  /** Exposure as a percentage of total portfolio equity. */
  get percentage(): number {
    return (this.props.amount / this.props.portfolioEquity) * 100;
  }

  exceeds(limitPercentage: number): boolean {
    return this.percentage > limitPercentage;
  }
}
