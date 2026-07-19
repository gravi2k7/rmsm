import { Entity, Guard } from "@rmsm/core";
import type { SymbolCode } from "@rmsm/market";

export type PositionSide = "LONG" | "SHORT";
export type PositionStatus = "OPEN" | "CLOSED";

export interface PositionProps {
  readonly symbolCode: SymbolCode;
  readonly side: PositionSide;
  readonly quantityUnits: number;
  readonly averageEntryPrice: number;
  status: PositionStatus;
  readonly openedAt: Date;
  closedAt?: Date;
  averageExitPrice?: number;
  realizedPnl?: number;
}

/**
 * A trading position — `LONG` or `SHORT`, `OPEN` or `CLOSED`. Owned by
 * `Portfolio` (which raises `PositionOpenedEvent`/`PositionClosedEvent`
 * on this entity's behalf, per the same "events raised at the aggregate
 * root" convention every other package in this platform follows) —
 * `Position` itself has no domain events of its own.
 */
export class Position extends Entity<string> {
  private props: PositionProps;

  private constructor(id: string, props: PositionProps) {
    super(id);
    this.props = props;
  }

  static open(id: string, props: Omit<PositionProps, "status" | "closedAt" | "averageExitPrice" | "realizedPnl">): Position {
    Guard.againstEmptyString(id, "id");
    Guard.ensure(props.quantityUnits > 0, "quantityUnits must be positive.");
    Guard.ensure(props.averageEntryPrice > 0, "averageEntryPrice must be positive.");
    return new Position(id, { ...props, status: "OPEN" });
  }

  get symbolCode(): SymbolCode {
    return this.props.symbolCode;
  }

  get side(): PositionSide {
    return this.props.side;
  }

  get quantityUnits(): number {
    return this.props.quantityUnits;
  }

  get averageEntryPrice(): number {
    return this.props.averageEntryPrice;
  }

  get status(): PositionStatus {
    return this.props.status;
  }

  get openedAt(): Date {
    return this.props.openedAt;
  }

  get closedAt(): Date | undefined {
    return this.props.closedAt;
  }

  get averageExitPrice(): number | undefined {
    return this.props.averageExitPrice;
  }

  get realizedPnl(): number | undefined {
    return this.props.realizedPnl;
  }

  /** Unrealized P&L at `currentPrice` — `LONG` profits as price rises,
   * `SHORT` profits as price falls, so the sign of the price delta is
   * flipped for `SHORT` rather than treating both sides identically. */
  unrealizedPnlAt(currentPrice: number): number {
    const priceDelta = this.props.side === "LONG" ? currentPrice - this.props.averageEntryPrice : this.props.averageEntryPrice - currentPrice;
    return priceDelta * this.props.quantityUnits;
  }

  /** Closes the position at `exitPrice`, computing and recording its own
   * final realized P&L via the same directional logic `unrealizedPnlAt()`
   * uses. */
  close(exitPrice: number, closedAt: Date = new Date()): void {
    Guard.ensure(this.props.status === "OPEN", "cannot close a position that is not OPEN.");
    const realizedPnl = this.unrealizedPnlAt(exitPrice);
    this.props = { ...this.props, status: "CLOSED", closedAt, averageExitPrice: exitPrice, realizedPnl };
  }
}
