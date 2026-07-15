/**
 * Item 4's own worked example, exactly: Registered → Validated →
 * Initialized → Ready → Executing → Completed | Failed. A plain string
 * union, not a class hierarchy — "lifecycle must be extensible" (item
 * 4's own requirement) is satisfied by this being a type any future
 * phase can widen (adding e.g. "Cancelled" or "TimedOut" as new
 * members) without touching every existing consumer's logic, the same
 * extensibility a closed class hierarchy would make harder, not easier.
 */
export type IndicatorLifecycleState = "REGISTERED" | "VALIDATED" | "INITIALIZED" | "READY" | "EXECUTING" | "COMPLETED" | "FAILED" | "CANCELLED";

/**
 * The valid transitions between states — a real, checkable table
 * (`LIFECYCLE_TRANSITIONS`), not just documentation prose a real
 * implementation could silently violate. `ExecutionLifecycleTracker`
 * (`engine/execution-lifecycle-tracker.ts`, this phase's real
 * implementation) consults this table before allowing any transition,
 * rejecting an invalid one (e.g. `REGISTERED` → `EXECUTING`, skipping
 * validation) rather than allowing it silently.
 */
export const LIFECYCLE_TRANSITIONS: Record<IndicatorLifecycleState, IndicatorLifecycleState[]> = {
  REGISTERED: ["VALIDATED", "FAILED"],
  VALIDATED: ["INITIALIZED", "FAILED"],
  INITIALIZED: ["READY", "FAILED"],
  READY: ["EXECUTING", "CANCELLED", "FAILED"],
  EXECUTING: ["COMPLETED", "FAILED", "CANCELLED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

export interface LifecycleTransitionError {
  from: IndicatorLifecycleState;
  to: IndicatorLifecycleState;
}
