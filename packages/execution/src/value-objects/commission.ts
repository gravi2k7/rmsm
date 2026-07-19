import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { CurrencyCode } from "@rmsm/market";
import { InvalidFillError } from "../errors/execution.errors";

interface CommissionProps {
  readonly amount: number;
  readonly currency: CurrencyCode;
}

/** A fee charged for executing a fill — always non-negative (a rebate is
 * a real, distinct concept some venues offer, not modeled here as
 * "negative commission"; a future `Rebate` value object would be the
 * honest way to add that rather than overloading this one's sign). */
export class Commission extends ValueObject<CommissionProps> {
  private constructor(amount: number, currency: CurrencyCode) {
    super({ amount, currency });
  }

  static create(amount: number, currency: CurrencyCode): Result<Commission, InvalidFillError> {
    if (!Number.isFinite(amount) || amount < 0) {
      return err(new InvalidFillError("commission amount must be a non-negative, finite number."));
    }
    return ok(new Commission(amount, currency));
  }

  static zero(currency: CurrencyCode): Commission {
    return new Commission(0, currency);
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): CurrencyCode {
    return this.props.currency;
  }

  add(other: Commission): Result<Commission, InvalidFillError> {
    if (other.currency.value !== this.currency.value) {
      return err(new InvalidFillError(`cannot combine commissions in different currencies (${this.currency.value} vs ${other.currency.value}).`));
    }
    return Commission.create(this.amount + other.amount, this.currency);
  }
}
