import { AggregateRoot, Guard } from "@rmsm/core";
import type { SymbolCode } from "@rmsm/market";
import { Price } from "../value-objects/price";
import { Quantity } from "../value-objects/quantity";
import { Fill } from "./fill";
import { OrderCreatedEvent } from "../events/order-created.event";
import { OrderSubmittedEvent } from "../events/order-submitted.event";
import { OrderFilledEvent } from "../events/order-filled.event";
import { OrderPartiallyFilledEvent } from "../events/order-partially-filled.event";
import { OrderCancelledEvent } from "../events/order-cancelled.event";
import { InvalidOrderError, InvalidOrderTransitionError } from "../errors/execution.errors";

export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
export type OrderStatus = "PENDING" | "SUBMITTED" | "ACCEPTED" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED" | "REJECTED" | "EXPIRED";

const ALLOWED_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING: ["SUBMITTED", "CANCELLED", "REJECTED", "EXPIRED"],
  SUBMITTED: ["ACCEPTED", "REJECTED", "CANCELLED", "EXPIRED"],
  ACCEPTED: ["PARTIALLY_FILLED", "FILLED", "CANCELLED", "EXPIRED"],
  PARTIALLY_FILLED: ["PARTIALLY_FILLED", "FILLED", "CANCELLED"],
  FILLED: [],
  CANCELLED: [],
  REJECTED: [],
  EXPIRED: [],
};

export interface OrderProps {
  /** The approved `@rmsm/decision` `Decision` this order executes — an id
   * reference, not a live dependency (this package doesn't import
   * `@rmsm/decision` for this field's type, matching the same
   * id-reference pattern `@rmsm/opportunity`'s `Signal.sourceId` and
   * `@rmsm/decision`'s own `Decision.opportunityId` already establish). */
  readonly decisionId: string;
  readonly symbolCode: SymbolCode;
  readonly side: OrderSide;
  readonly type: OrderType;
  readonly quantity: Quantity;
  /** Required for `LIMIT`/`STOP_LIMIT`, absent for `MARKET`/`STOP` — validated
   * at construction, not just by convention. */
  readonly limitPrice?: Price;
  /** Required for `STOP`/`STOP_LIMIT`. */
  readonly stopPrice?: Price;
  status: OrderStatus;
  fills: Fill[];
  readonly createdAt: Date;
}

/**
 * A trade order — the execution-facing representation of an approved
 * `Decision`, tracked through its full broker lifecycle from creation to
 * a terminal state (filled, cancelled, rejected, or expired). Aggregate
 * root: every lifecycle transition is a real domain event other parts of
 * the system (a portfolio updating on fills, a strategy service noticing
 * a rejection) need to react to.
 */
export class Order extends AggregateRoot<string> {
  private props: OrderProps;

  private constructor(id: string, props: OrderProps) {
    super(id);
    this.props = props;
  }

  static create(
    id: string,
    props: Pick<OrderProps, "decisionId" | "symbolCode" | "side" | "type" | "quantity" | "limitPrice" | "stopPrice">,
    occurredAt: Date = new Date(),
  ): Order {
    Guard.againstEmptyString(id, "id");
    Guard.againstEmptyString(props.decisionId, "decisionId");

    if ((props.type === "LIMIT" || props.type === "STOP_LIMIT") && !props.limitPrice) {
      throw new InvalidOrderError(`${props.type} orders require a limitPrice.`);
    }
    if ((props.type === "STOP" || props.type === "STOP_LIMIT") && !props.stopPrice) {
      throw new InvalidOrderError(`${props.type} orders require a stopPrice.`);
    }

    const order = new Order(id, { ...props, status: "PENDING", fills: [], createdAt: occurredAt });
    order.addDomainEvent(new OrderCreatedEvent(id, occurredAt));
    return order;
  }

  get decisionId(): string {
    return this.props.decisionId;
  }

  get symbolCode(): SymbolCode {
    return this.props.symbolCode;
  }

  get side(): OrderSide {
    return this.props.side;
  }

  get type(): OrderType {
    return this.props.type;
  }

  get quantity(): Quantity {
    return this.props.quantity;
  }

  get limitPrice(): Price | undefined {
    return this.props.limitPrice;
  }

  get stopPrice(): Price | undefined {
    return this.props.stopPrice;
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  get fills(): readonly Fill[] {
    return this.props.fills;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** The sum of every fill's own quantity so far — always `<=
   * quantity.units` for a well-formed order (enforced by `applyFill()`,
   * not merely assumed here). */
  get filledQuantityUnits(): number {
    return this.props.fills.reduce((sum, fill) => sum + fill.quantity.units, 0);
  }

  /** The quantity-weighted average of every fill's own price —
   * `undefined` if there are no fills yet, rather than a misleading `0`. */
  get averageFillPrice(): number | undefined {
    if (this.props.fills.length === 0) return undefined;
    const totalUnits = this.filledQuantityUnits;
    if (totalUnits === 0) return undefined;
    const weightedSum = this.props.fills.reduce((sum, fill) => sum + fill.price.amount * fill.quantity.units, 0);
    return weightedSum / totalUnits;
  }

  private transitionTo(next: OrderStatus): void {
    const allowed = ALLOWED_TRANSITIONS[this.props.status];
    if (!allowed.includes(next)) {
      throw new InvalidOrderTransitionError(this.props.status, next);
    }
    this.props = { ...this.props, status: next };
  }

  submit(occurredAt: Date = new Date()): void {
    this.transitionTo("SUBMITTED");
    this.addDomainEvent(new OrderSubmittedEvent(this.id, occurredAt));
  }

  /** No dedicated `OrderAccepted` event — acceptance by the venue is a
   * real status but isn't in this domain's own required event list; the
   * status transition alone is the durable record. */
  accept(): void {
    this.transitionTo("ACCEPTED");
  }

  /**
   * Records a new fill and transitions to `PARTIALLY_FILLED` or `FILLED`
   * depending on whether the order's own `quantity` is now fully
   * satisfied — raising the matching event either way. Rejects a fill
   * that would overfill the order (`filledQuantityUnits` exceeding
   * `quantity.units`) rather than silently accepting bad data.
   */
  applyFill(fill: Fill, occurredAt: Date = new Date()): void {
    const allowed = ALLOWED_TRANSITIONS[this.props.status];
    if (!allowed.includes("PARTIALLY_FILLED") && !allowed.includes("FILLED")) {
      throw new InvalidOrderTransitionError(this.props.status, "PARTIALLY_FILLED");
    }

    const projectedTotal = this.filledQuantityUnits + fill.quantity.units;
    if (projectedTotal > this.props.quantity.units + 1e-9) {
      throw new InvalidOrderError(
        `fill of ${fill.quantity.units} would overfill order ${this.id} (already filled ${this.filledQuantityUnits} of ${this.props.quantity.units}).`,
      );
    }

    this.props = { ...this.props, fills: [...this.props.fills, fill] };

    if (projectedTotal >= this.props.quantity.units - 1e-9) {
      this.props = { ...this.props, status: "FILLED" };
      this.addDomainEvent(new OrderFilledEvent(this.id, occurredAt));
    } else {
      this.props = { ...this.props, status: "PARTIALLY_FILLED" };
      this.addDomainEvent(new OrderPartiallyFilledEvent(this.id, occurredAt));
    }
  }

  cancel(occurredAt: Date = new Date()): void {
    this.transitionTo("CANCELLED");
    this.addDomainEvent(new OrderCancelledEvent(this.id, occurredAt));
  }

  /** No dedicated event for rejection/expiry in this domain's own
   * required event list — the status transition itself is the record,
   * same reasoning as `accept()`. */
  reject(): void {
    this.transitionTo("REJECTED");
  }

  expire(): void {
    this.transitionTo("EXPIRED");
  }
}
