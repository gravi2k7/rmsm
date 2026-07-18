import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { Price } from "./price";
import { Pip } from "./pip";
import { InvalidSpreadError } from "../errors/market.errors";

interface SpreadProps {
  readonly value: number;
}

/** The ask/bid difference for a `Quote` — always non-negative in a
 * correctly-functioning market (a negative spread, "crossed market," is
 * a real anomaly worth rejecting at construction rather than silently
 * accepting). Computed directly from `Price.amount`, not via
 * `Price.subtract()` — `Price` itself disallows negative amounts, which
 * is right for a *price* but would wrongly reject the (valid, zero)
 * spread case; `Spread` validates non-negativity itself instead. */
export class Spread extends ValueObject<SpreadProps> {
  private constructor(value: number) {
    super({ value });
  }

  static fromBidAsk(bid: Price, ask: Price): Result<Spread, InvalidSpreadError> {
    if (bid.precision !== ask.precision) {
      return err(new InvalidSpreadError(`bid and ask must share the same precision (${bid.precision} vs ${ask.precision}).`));
    }
    const value = ask.amount - bid.amount;
    if (value < 0) {
      return err(new InvalidSpreadError(`ask (${ask.amount}) is less than bid (${bid.amount}) — crossed market.`));
    }
    return ok(new Spread(value));
  }

  get value(): number {
    return this.props.value;
  }

  toPips(pip: Pip): number {
    return pip.toPips(this.props.value);
  }
}
