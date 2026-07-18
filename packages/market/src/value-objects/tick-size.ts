import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { InvalidPriceError } from "../errors/market.errors";

interface TickSizeProps {
  readonly value: number;
}

/** The minimum price increment a `Symbol` can move by (e.g. `0.00001`
 * for `EURUSD` at 5-decimal precision, `0.25` for many futures
 * contracts). Must be strictly positive — a zero or negative tick size
 * would mean "prices can move by any amount, including not moving at
 * all," which isn't a meaningful minimum increment. */
export class TickSize extends ValueObject<TickSizeProps> {
  private constructor(value: number) {
    super({ value });
  }

  static create(value: number): Result<TickSize, InvalidPriceError> {
    if (!Number.isFinite(value) || value <= 0) {
      return err(new InvalidPriceError("tick size must be a positive, finite number."));
    }
    return ok(new TickSize(value));
  }

  get value(): number {
    return this.props.value;
  }

  /** Rounds an arbitrary price to the nearest valid tick for this
   * increment — e.g. a tick size of `0.25` rounds `100.10` to `100.00`. */
  roundToTick(price: number): number {
    return Math.round(price / this.props.value) * this.props.value;
  }
}
