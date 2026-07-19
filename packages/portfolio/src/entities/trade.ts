import { Entity, Guard } from "@rmsm/core";
import type { SymbolCode } from "@rmsm/market";
import type { PositionSide } from "./position";
import { InvalidTradeError } from "../errors/portfolio.errors";

export interface TradeProps {
  readonly symbolCode: SymbolCode;
  readonly side: PositionSide;
  readonly quantityUnits: number;
  readonly entryPrice: number;
  readonly exitPrice: number;
  readonly realizedPnl: number;
  readonly openedAt: Date;
  readonly closedAt: Date;
}

export interface ClosedPositionLike {
  readonly symbolCode: SymbolCode;
  readonly side: PositionSide;
  readonly quantityUnits: number;
  readonly averageEntryPrice: number;
  readonly averageExitPrice?: number;
  readonly realizedPnl?: number;
  readonly openedAt: Date;
  readonly closedAt?: Date;
}

/**
 * A completed round-trip trade — the analytics-facing record
 * `PerformanceService` actually computes win rate/profit factor/Sharpe
 * ratio from. Built once a `Position` closes (a `Trade` is derived from
 * a closed `Position`, not maintained independently), and immutable
 * thereafter — a trade's own history doesn't change after the fact.
 */
export class Trade extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: TradeProps,
  ) {
    super(id);
  }

  static create(id: string, props: TradeProps): Trade {
    Guard.againstEmptyString(id, "id");
    Guard.ensure(props.quantityUnits > 0, "quantityUnits must be positive.");
    Guard.ensure(props.closedAt.getTime() >= props.openedAt.getTime(), "closedAt must not be before openedAt.");
    return new Trade(id, props);
  }

  /** Builds a `Trade` from an already-closed `Position` (or anything
   * with the same shape) — throws `InvalidTradeError` if the position
   * isn't actually fully closed (missing exit price/P&L/close time),
   * since a `Trade` can't represent an incomplete round trip. */
  static fromClosedPosition(id: string, position: ClosedPositionLike): Trade {
    if (position.averageExitPrice === undefined || position.realizedPnl === undefined || position.closedAt === undefined) {
      throw new InvalidTradeError("cannot build a Trade from a position that is not fully closed (missing exit price, realized P&L, or close time).");
    }
    return Trade.create(id, {
      symbolCode: position.symbolCode,
      side: position.side,
      quantityUnits: position.quantityUnits,
      entryPrice: position.averageEntryPrice,
      exitPrice: position.averageExitPrice,
      realizedPnl: position.realizedPnl,
      openedAt: position.openedAt,
      closedAt: position.closedAt,
    });
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

  get entryPrice(): number {
    return this.props.entryPrice;
  }

  get exitPrice(): number {
    return this.props.exitPrice;
  }

  get realizedPnl(): number {
    return this.props.realizedPnl;
  }

  get openedAt(): Date {
    return this.props.openedAt;
  }

  get closedAt(): Date {
    return this.props.closedAt;
  }

  isWin(): boolean {
    return this.props.realizedPnl > 0;
  }
}
