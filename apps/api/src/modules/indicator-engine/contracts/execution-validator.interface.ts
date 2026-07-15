import type { ExecutionRequest } from "./execution-request.interface";
import type { ExecutionContext } from "./execution-context.interface";

/**
 * Runtime validation (item 8) — checks specific to an EXECUTION
 * attempt, distinct from both `IndicatorValidator` (Phase 1,
 * request-vs-definition validation) and `RegistryValidator` (Phase 2A,
 * definition-vs-registration validation). A THIRD, again deliberately
 * separate, validator — this one runs mid-execution, after a request
 * has already passed Phase 1's `IndicatorValidator` checks, catching
 * problems only visible once the engine has actually started preparing
 * a context (e.g. AI-101 genuinely has no candle data for the
 * requested range — not knowable until the engine tries to fetch it).
 */
export interface ExecutionValidator {
  /** Item 8: "invalid execution context." Checked once ExecutionContext exists, before it's frozen and handed to Indicator.calculate(). */
  validateContext(context: ExecutionContext): void;
  /** Item 8: "missing market data" — the candle array AI-101 actually returned is empty or doesn't cover the requested range, discovered only after the fetch, not something request-time validation could know in advance. */
  validateMarketDataPresence(context: ExecutionContext): void;
  /** Item 8: "unsupported timeframe" — a second check of the same concern IndicatorValidator.validateTimeframe (Phase 1) already covers, deliberately redundant: request-time validation checks the CALLER's chosen timeframe against the definition; this checks the ACTUAL context that's about to execute, catching a bug in context construction itself, not just a bad caller input. */
  validateTimeframe(context: ExecutionContext): void;
  /** Item 8: "invalid parameters" — same reasoning as validateTimeframe: a second, context-level check, not a duplicate of IndicatorValidator's request-level one for its own sake. */
  validateParameters(context: ExecutionContext): void;
  /** Item 8: "invalid lifecycle" — an execution attempting a lifecycle transition LIFECYCLE_TRANSITIONS (indicator-lifecycle.interface.ts) doesn't allow. */
  validateLifecycleTransition(from: import("./indicator-lifecycle.interface").IndicatorLifecycleState, to: import("./indicator-lifecycle.interface").IndicatorLifecycleState): void;
  /** Item 8: "execution cancellation" — the request's own AbortSignal (ExecutionRequest.executionOptions.cancellationSignal) has already fired before or during execution. */
  validateNotCancelled(request: ExecutionRequest): void;
  /** Item 8: "timeout configuration" — a non-sensical timeout value (e.g. negative, or zero when the caller clearly meant "no timeout" via undefined instead). */
  validateTimeoutConfiguration(request: ExecutionRequest): void;
}
