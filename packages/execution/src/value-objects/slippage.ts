import { ValueObject } from "@rmsm/core";
import type { Price } from "@rmsm/market";

export type SlippageDirection = "FAVORABLE" | "UNFAVORABLE" | "NONE";

interface SlippageProps {
  readonly amount: number;
  readonly direction: SlippageDirection;
}

/**
 * The difference between an order's own expected price (its limit price,
 * or the quoted price at submission time for a market order) and the
 * price it actually filled at. Positive `amount` always means "the fill
 * differed from expectation by this much" — `direction` (not the sign of
 * `amount`) is what tells you whether that difference helped or hurt,
 * since "favorable" depends on order side (a BUY filling *below*
 * expectation is favorable; a SELL filling *below* expectation is
 * unfavorable) — a plain signed number alone can't express that without
 * the caller also tracking side separately.
 */
export class Slippage extends ValueObject<SlippageProps> {
  private constructor(amount: number, direction: SlippageDirection) {
    super({ amount, direction });
  }

  /** Computes slippage for a BUY order: filling above the expected price
   * is unfavorable (paid more than expected); below is favorable. */
  static forBuy(expectedPrice: Price, actualPrice: Price): Slippage {
    return Slippage.compute(expectedPrice, actualPrice, actualPrice.amount > expectedPrice.amount);
  }

  /** Computes slippage for a SELL order: filling below the expected price
   * is unfavorable (received less than expected); above is favorable. */
  static forSell(expectedPrice: Price, actualPrice: Price): Slippage {
    return Slippage.compute(expectedPrice, actualPrice, actualPrice.amount < expectedPrice.amount);
  }

  private static compute(expectedPrice: Price, actualPrice: Price, isUnfavorable: boolean): Slippage {
    const amount = Math.abs(actualPrice.amount - expectedPrice.amount);
    if (amount === 0) return new Slippage(0, "NONE");
    return new Slippage(amount, isUnfavorable ? "UNFAVORABLE" : "FAVORABLE");
  }

  get amount(): number {
    return this.props.amount;
  }

  get direction(): SlippageDirection {
    return this.props.direction;
  }

  isZero(): boolean {
    return this.props.direction === "NONE";
  }
}
