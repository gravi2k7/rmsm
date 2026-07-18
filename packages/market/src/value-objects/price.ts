import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { InvalidPriceError } from "../errors/market.errors";

interface PriceProps {
  readonly amount: number;
  readonly precision: number;
}

const MAX_PRECISION = 10;

/**
 * An immutable price at a given decimal precision (a `Symbol`'s own
 * `precision` field — e.g. 5 for `EURUSD`, 2 for most equities). Rounds
 * to `precision` on construction and after every arithmetic operation,
 * so two `Price`s built from the same real-world quote always compare
 * equal regardless of tiny floating-point representation differences —
 * the specific problem an unrounded `number` comparison would otherwise
 * intermittently get wrong.
 */
export class Price extends ValueObject<PriceProps> {
  private constructor(amount: number, precision: number) {
    super({ amount: roundTo(amount, precision), precision });
  }

  static create(amount: number, precision: number): Result<Price, InvalidPriceError> {
    if (!Number.isFinite(amount)) {
      return err(new InvalidPriceError("amount must be a finite number."));
    }
    if (amount < 0) {
      return err(new InvalidPriceError("amount must not be negative."));
    }
    if (!Number.isInteger(precision) || precision < 0 || precision > MAX_PRECISION) {
      return err(new InvalidPriceError(`precision must be an integer between 0 and ${MAX_PRECISION}.`));
    }
    return ok(new Price(amount, precision));
  }

  get amount(): number {
    return this.props.amount;
  }

  get precision(): number {
    return this.props.precision;
  }

  /** Adds `other` — both operands must share the same `precision` (a
   * `Price` at 5 decimals and one at 2 decimals aren't the same unit of
   * measurement, so combining them isn't a meaningful "add" without the
   * caller deciding how to reconcile the precisions first). */
  add(other: Price): Result<Price, InvalidPriceError> {
    if (other.precision !== this.precision) {
      return err(new InvalidPriceError(`cannot combine prices of different precision (${this.precision} vs ${other.precision}).`));
    }
    return Price.create(this.amount + other.amount, this.precision);
  }

  subtract(other: Price): Result<Price, InvalidPriceError> {
    if (other.precision !== this.precision) {
      return err(new InvalidPriceError(`cannot combine prices of different precision (${this.precision} vs ${other.precision}).`));
    }
    return Price.create(this.amount - other.amount, this.precision);
  }

  isGreaterThan(other: Price): boolean {
    return this.amount > other.amount;
  }

  isLessThan(other: Price): boolean {
    return this.amount < other.amount;
  }

  toString(): string {
    return this.amount.toFixed(this.precision);
  }
}

function roundTo(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
