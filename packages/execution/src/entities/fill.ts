import { Entity, Guard } from "@rmsm/core";
import { Price } from "../value-objects/price";
import { Quantity } from "../value-objects/quantity";
import { Commission } from "../value-objects/commission";

export interface FillProps {
  readonly orderId: string;
  readonly price: Price;
  readonly quantity: Quantity;
  readonly commission: Commission;
  readonly filledAt: Date;
}

/** A single fill against an `Order` — an order fills in one or more of
 * these (a `MARKET` order typically fills in one; a large `LIMIT` order
 * on a thin book might fill in several as liquidity becomes available).
 * `Order.applyFill()` is the only place these get attached to an order;
 * a `Fill` has no independent lifecycle of its own once recorded. */
export class Fill extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: FillProps,
  ) {
    super(id);
  }

  static create(id: string, props: FillProps): Fill {
    Guard.againstEmptyString(id, "id");
    Guard.againstEmptyString(props.orderId, "orderId");
    Guard.ensure(props.quantity.units > 0, "fill quantity must be positive.");
    return new Fill(id, props);
  }

  get orderId(): string {
    return this.props.orderId;
  }

  get price(): Price {
    return this.props.price;
  }

  get quantity(): Quantity {
    return this.props.quantity;
  }

  get commission(): Commission {
    return this.props.commission;
  }

  get filledAt(): Date {
    return this.props.filledAt;
  }
}
