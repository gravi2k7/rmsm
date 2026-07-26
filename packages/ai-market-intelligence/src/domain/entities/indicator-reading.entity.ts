import type { Timeframe } from "@rmsm/market";

/**
 * The shape this package expects an indicator engine to hand over —
 * NOT a computation of any indicator itself. `apps/api`'s
 * `indicator-engine` module (or any other concrete engine) is the real
 * producer of these; this package only ever consumes them, exactly the
 * same "port declared here, implementation lives entirely outside"
 * split `@rmsm/strategy`'s own `StrategyEngine` interface uses.
 */
export interface IndicatorReading {
  readonly name: string;
  readonly value: number;
  readonly timeframe: Timeframe;
  readonly computedAt: Date;
}
