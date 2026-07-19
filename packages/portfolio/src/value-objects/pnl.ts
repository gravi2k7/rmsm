import { ValueObject } from "@rmsm/core";
import type { CurrencyCode } from "@rmsm/market";

export type PnLKind = "REALIZED" | "UNREALIZED";

interface PnLProps {
  readonly amount: number;
  readonly currency: CurrencyCode;
  readonly kind: PnLKind;
}

/** A profit-or-loss amount — signed (`amount` can be negative), unlike
 * `@rmsm/decision`'s `RiskScore` or `@rmsm/opportunity`'s `Confidence`
 * (both bounded, non-negative scores). `kind` distinguishes realized
 * (locked in by a closed `Position`) from unrealized (mark-to-market on
 * an open one) — the two are never simply summed as if interchangeable,
 * since only realized P&L has actually affected `Balance`. */
export class PnL extends ValueObject<PnLProps> {
  private constructor(amount: number, currency: CurrencyCode, kind: PnLKind) {
    super({ amount, currency, kind });
  }

  static realized(amount: number, currency: CurrencyCode): PnL {
    return new PnL(amount, currency, "REALIZED");
  }

  static unrealized(amount: number, currency: CurrencyCode): PnL {
    return new PnL(amount, currency, "UNREALIZED");
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): CurrencyCode {
    return this.props.currency;
  }

  get kind(): PnLKind {
    return this.props.kind;
  }

  isProfit(): boolean {
    return this.props.amount > 0;
  }

  isLoss(): boolean {
    return this.props.amount < 0;
  }
}
