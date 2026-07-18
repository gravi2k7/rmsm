import { Entity, Guard } from "@rmsm/core";
import { SymbolCode } from "../value-objects/symbol-code";
import { Price } from "../value-objects/price";
import { Spread } from "../value-objects/spread";
import { InvalidSpreadError } from "../errors/market.errors";
import type { Result } from "@rmsm/core";

export interface QuoteProps {
  readonly symbolCode: SymbolCode;
  readonly timestamp: Date;
  readonly bid: Price;
  readonly ask: Price;
  readonly last?: Price;
}

/**
 * The current best bid/ask/mid/last snapshot for a symbol — a read-model
 * entity built from the latest `Tick`(s), not a raw feed event itself
 * (that's `Tick`'s own job). `mid`/`spread` are computed, not stored, so
 * they can never drift out of sync with `bid`/`ask`.
 */
export class Quote extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: QuoteProps,
  ) {
    super(id);
  }

  static create(id: string, props: QuoteProps): Quote {
    Guard.againstEmptyString(id, "id");
    return new Quote(id, props);
  }

  get symbolCode(): SymbolCode {
    return this.props.symbolCode;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get bid(): Price {
    return this.props.bid;
  }

  get ask(): Price {
    return this.props.ask;
  }

  get last(): Price | undefined {
    return this.props.last;
  }

  /** The midpoint between bid and ask. Both must share the same
   * `precision` — guaranteed in practice, since both come from the same
   * symbol's own quote feed. */
  get mid(): Price {
    const midAmount = (this.props.bid.amount + this.props.ask.amount) / 2;
    const result = Price.create(midAmount, this.props.bid.precision);
    // bid/ask are already valid, non-negative Prices of the same
    // precision (enforced by construction elsewhere in this domain), so
    // their average can only fail Price.create() if that invariant was
    // somehow violated upstream — a real bug worth surfacing loudly
    // rather than silently returning a wrong mid price.
    if (!result.ok) {
      throw new Error(`Quote.mid: unexpected invalid midpoint price — ${result.error.message}`);
    }
    return result.value;
  }

  get spread(): Result<Spread, InvalidSpreadError> {
    return Spread.fromBidAsk(this.props.bid, this.props.ask);
  }
}
