import { Entity, Guard } from "@rmsm/core";
import type { SymbolCode } from "@rmsm/market";

export interface PositionSizeProps {
  readonly symbolCode: SymbolCode;
  /** The computed size, in the symbol's own base units (not lots —
   * `RiskService` is responsible for converting to/from lots using
   * `@rmsm/market`'s own `LotSize`, this entity just records the final
   * unit count). */
  readonly units: number;
  /** What produced `units` — e.g. `"2% account risk / 50 pip stop"` —
   * kept as a human-readable audit trail rather than only the number,
   * since "why was this size chosen" matters as much as the size itself
   * for a risk-sensitive domain. */
  readonly calculationBasis: string;
  readonly accountEquity: number;
  readonly riskAmount: number;
}

/** The result of sizing a position for a specific opportunity — a real
 * calculation output, not a live-updating value (if account equity
 * changes later, that doesn't retroactively resize an already-computed
 * `PositionSize`; a new one is computed for the next decision). */
export class PositionSize extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: PositionSizeProps,
  ) {
    super(id);
  }

  static create(id: string, props: PositionSizeProps): PositionSize {
    Guard.againstEmptyString(id, "id");
    Guard.ensure(props.units > 0, "units must be positive.");
    Guard.ensure(props.accountEquity > 0, "accountEquity must be positive.");
    Guard.ensure(props.riskAmount >= 0, "riskAmount must not be negative.");
    return new PositionSize(id, props);
  }

  get symbolCode(): SymbolCode {
    return this.props.symbolCode;
  }

  get units(): number {
    return this.props.units;
  }

  get calculationBasis(): string {
    return this.props.calculationBasis;
  }

  get accountEquity(): number {
    return this.props.accountEquity;
  }

  get riskAmount(): number {
    return this.props.riskAmount;
  }

  /** The fraction of account equity this position actually risks — a
   * derived check, not a stored field, so it can never drift out of sync
   * with `accountEquity`/`riskAmount`. */
  get riskFraction(): number {
    return this.props.riskAmount / this.props.accountEquity;
  }
}
