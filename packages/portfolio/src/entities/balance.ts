import { Entity, Guard } from "@rmsm/core";
import { InvalidBalanceError } from "../errors/portfolio.errors";

export type BalanceEntryType = "DEPOSIT" | "WITHDRAWAL" | "REALIZED_PNL" | "COMMISSION";

export interface BalanceProps {
  readonly type: BalanceEntryType;
  /** Signed: positive for `DEPOSIT` and a profitable `REALIZED_PNL`,
   * negative for `WITHDRAWAL`, `COMMISSION`, and a losing `REALIZED_PNL`
   * — one consistent signed-amount convention rather than a separate
   * "direction" field, since every one of these entry types already has
   * a natural sign. */
  readonly amount: number;
  readonly resultingBalance: number;
  readonly occurredAt: Date;
}

/** One entry in the portfolio's own cash-balance ledger — every deposit,
 * withdrawal, realized P&L, and commission is recorded as one of these,
 * so `Portfolio.cashBalance` is always reconstructable/auditable from
 * its own entry history rather than being a single mutable number with
 * no record of how it got there. */
export class Balance extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: BalanceProps,
  ) {
    super(id);
  }

  static record(id: string, props: BalanceProps): Balance {
    Guard.againstEmptyString(id, "id");
    if (!Number.isFinite(props.amount)) {
      throw new InvalidBalanceError("amount must be a finite number.");
    }
    if (!Number.isFinite(props.resultingBalance)) {
      throw new InvalidBalanceError("resultingBalance must be a finite number.");
    }
    return new Balance(id, props);
  }

  get type(): BalanceEntryType {
    return this.props.type;
  }

  get amount(): number {
    return this.props.amount;
  }

  get resultingBalance(): number {
    return this.props.resultingBalance;
  }

  get occurredAt(): Date {
    return this.props.occurredAt;
  }
}
