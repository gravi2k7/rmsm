import { Entity, Guard } from "@rmsm/core";
import { InvalidPortfolioError } from "../errors/portfolio.errors";

export interface EquityProps {
  readonly balance: number;
  readonly unrealizedPnl: number;
  readonly recordedAt: Date;
}

/**
 * One point on the portfolio's own equity curve — `balance` (cash) plus
 * `unrealizedPnl` (mark-to-market on open positions) at a specific
 * instant. `PerformanceService` builds a `Drawdown`/Sharpe-ratio
 * calculation from a *series* of these, not from `Portfolio`'s own
 * current live state alone — historical equity points are what make
 * "maximum drawdown" and "Sharpe ratio" meaningful at all.
 */
export class Equity extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: EquityProps,
  ) {
    super(id);
  }

  static record(id: string, props: EquityProps): Equity {
    Guard.againstEmptyString(id, "id");
    if (!Number.isFinite(props.balance)) {
      throw new InvalidPortfolioError("balance must be a finite number.");
    }
    if (!Number.isFinite(props.unrealizedPnl)) {
      throw new InvalidPortfolioError("unrealizedPnl must be a finite number.");
    }
    return new Equity(id, props);
  }

  get balance(): number {
    return this.props.balance;
  }

  get unrealizedPnl(): number {
    return this.props.unrealizedPnl;
  }

  get recordedAt(): Date {
    return this.props.recordedAt;
  }

  /** Total equity at this point in time — the value `Drawdown`/Sharpe
   * calculations actually operate on, computed rather than stored, so
   * it can never drift from `balance`/`unrealizedPnl`. */
  get value(): number {
    return this.props.balance + this.props.unrealizedPnl;
  }
}
