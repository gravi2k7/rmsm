import { Entity, Guard } from "@rmsm/core";

export type Trend = "UP" | "DOWN" | "SIDEWAYS";
export type VolatilityLevel = "LOW" | "MEDIUM" | "HIGH";
export type LiquidityLevel = "LOW" | "MEDIUM" | "HIGH";

export interface MarketContextProps {
  readonly trend: Trend;
  readonly volatility: VolatilityLevel;
  readonly liquidity: LiquidityLevel;
  readonly capturedAt: Date;
}

/** A snapshot of broader market conditions at the moment an opportunity
 * was created — captured once and never mutated afterward (a `Trend`
 * that flips minutes later doesn't retroactively change what conditions
 * actually looked like when the opportunity was generated). Used by
 * `ScoringService` to adjust confidence: the same signal is worth more
 * in a trending, liquid market than a choppy, illiquid one. */
export class MarketContext extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: MarketContextProps,
  ) {
    super(id);
  }

  static capture(id: string, props: MarketContextProps): MarketContext {
    Guard.againstEmptyString(id, "id");
    return new MarketContext(id, props);
  }

  get trend(): Trend {
    return this.props.trend;
  }

  get volatility(): VolatilityLevel {
    return this.props.volatility;
  }

  get liquidity(): LiquidityLevel {
    return this.props.liquidity;
  }

  get capturedAt(): Date {
    return this.props.capturedAt;
  }

  /** Whether conditions are favorable for acting on a signal at all —
   * high volatility combined with low liquidity is the classic
   * "dangerous to trade right now" combination (wide, unstable spreads;
   * slippage risk), regardless of how strong the underlying signal is. */
  isFavorable(): boolean {
    return !(this.props.volatility === "HIGH" && this.props.liquidity === "LOW");
  }
}
