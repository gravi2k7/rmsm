import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { InvalidPriceError } from "../errors/market.errors";

interface PipProps {
  readonly size: number;
}

/**
 * The conventional "pip" size for a forex `Symbol` — distinct from
 * `TickSize` (the *minimum* increment a broker will quote, often smaller
 * than a pip, e.g. fractional/"pipette" pricing) and distinct from
 * `Symbol.precision` (how many decimals are displayed). Most pairs use
 * `0.0001`; JPY-quoted pairs conventionally use `0.01`.
 */
export class Pip extends ValueObject<PipProps> {
  private constructor(size: number) {
    super({ size });
  }

  static create(size: number): Result<Pip, InvalidPriceError> {
    if (!Number.isFinite(size) || size <= 0) {
      return err(new InvalidPriceError("pip size must be a positive, finite number."));
    }
    return ok(new Pip(size));
  }

  /** The standard, non-JPY forex pip size (`0.0001`). */
  static standard(): Pip {
    return new Pip(0.0001);
  }

  /** The conventional JPY-quoted-pair pip size (`0.01`). */
  static jpy(): Pip {
    return new Pip(0.01);
  }

  get size(): number {
    return this.props.size;
  }

  /** Converts a raw price difference into a pip count — e.g. a
   * `0.00025` move at standard pip size is `2.5` pips. */
  toPips(priceDifference: number): number {
    return priceDifference / this.props.size;
  }
}
