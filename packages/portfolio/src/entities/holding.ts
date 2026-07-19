import { Entity, Guard } from "@rmsm/core";
import type { SymbolCode } from "@rmsm/market";

export interface HoldingProps {
  readonly symbolCode: SymbolCode;
  readonly netQuantityUnits: number;
  readonly averagePrice: number;
}

/**
 * The net current holding for a symbol — distinct from `Position`
 * (which tracks one specific open/closed trade's own lifecycle):
 * `Holding` is the *aggregate* across every currently-open `Position`
 * for that symbol, the reporting-friendly "what do I actually hold
 * right now" view a portfolio summary screen would show, rather than a
 * list of individual positions a reader has to sum themselves. Positive
 * `netQuantityUnits` means net long; negative means net short.
 */
export class Holding extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: HoldingProps,
  ) {
    super(id);
  }

  static create(id: string, props: HoldingProps): Holding {
    Guard.againstEmptyString(id, "id");
    Guard.ensure(props.averagePrice > 0, "averagePrice must be positive.");
    return new Holding(id, props);
  }

  get symbolCode(): SymbolCode {
    return this.props.symbolCode;
  }

  get netQuantityUnits(): number {
    return this.props.netQuantityUnits;
  }

  get averagePrice(): number {
    return this.props.averagePrice;
  }

  isLong(): boolean {
    return this.props.netQuantityUnits > 0;
  }

  isShort(): boolean {
    return this.props.netQuantityUnits < 0;
  }

  isFlat(): boolean {
    return this.props.netQuantityUnits === 0;
  }

  marketValueAt(currentPrice: number): number {
    return Math.abs(this.props.netQuantityUnits) * currentPrice;
  }
}
