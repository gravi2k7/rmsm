import type { ExecutionRequest } from "./execution-request.interface";
import type { ExecutionResult } from "./execution-result.interface";

/**
 * Scheduling infrastructure (item 5) — sequential execution (this
 * phase's real implementation), with real extension points for future
 * parallel execution, NOT dependency-graph-aware (that's
 * `ComputationScheduler`, Phase 2C — see that interface's own updated
 * scope note). This scheduler only knows "run these N independent
 * requests, in this order, respecting cancellation/timeout" — it has no
 * concept of one request depending on another's output.
 *
 * "No threading implementation. No workers. Architecture only" (item
 * 5's own words) — `schedule()`'s real Phase 2B implementation
 * (`engine/execution-scheduler.service.ts`) runs requests sequentially
 * via plain `async`/`await`, genuinely real code, but makes no claim of
 * true parallelism (Node's own single-threaded event loop already rules
 * that out for CPU-bound work without a worker-thread pool, which this
 * phase explicitly doesn't build).
 */
export interface ExecutionScheduler {
  schedule(requests: ExecutionRequest[]): Promise<ExecutionResult[]>;
  /** Cancellation hook (item 5) — cancels every not-yet-started or in-flight request tracked by this scheduler; already-completed ones are unaffected. */
  cancelAll(): void;
}
