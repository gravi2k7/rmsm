import type { IndicatorInstance } from "./indicator-instance.interface";
import type { IndicatorTimeframe } from "./timeframe";
import type { CalculationWindow } from "./calculation-window.interface";

/**
 * Item 6's own field list: indicator instance, execution context,
 * calculation mode, timeframe, market data reference, execution
 * options. **One field interpreted deliberately, not literally, flagged
 * here rather than silently reinterpreted**: item 6 lists "execution
 * context" as something the REQUEST carries — but building the
 * `ExecutionContext` (item 2) from a request is `ComputationEngine`'s
 * own job (see that class's own comment); a request that already
 * contained a fully-built context would make the engine's own context-
 * preparation step meaningless. Read as "the request carries what's
 * *needed* to build a context" instead — `calculationWindow` (which
 * embeds calculation mode, item 6's separately-named field) plus
 * `marketDataReference`/`timeframe` below are exactly that.
 */
export interface ExecutionOptions {
  timeoutMs?: number;
  /** Explicit cancellation hook (item 5's own "cancellation hooks") — a caller can cancel an in-flight execution by triggering this signal; ComputationEngine checks it between lifecycle stages (real implementation, this phase), not mid-calculation (an indicator's own calculate() has no cancellation-checking obligation — it's a pure function expected to return quickly, per Phase 1's Core Principles). */
  cancellationSignal?: AbortSignal;
}

export interface ExecutionRequest {
  indicatorInstance: IndicatorInstance;
  timeframe: IndicatorTimeframe;
  marketDataReference: { instrumentId: string };
  calculationWindow: CalculationWindow;
  executionOptions: ExecutionOptions;
}
