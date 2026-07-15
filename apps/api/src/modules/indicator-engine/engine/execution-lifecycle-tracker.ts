import { LIFECYCLE_TRANSITIONS, IndicatorLifecycleState } from "../contracts/indicator-lifecycle.interface";
import { ExecutionError } from "../contracts/execution.errors";

class InvalidLifecycleTransitionError extends ExecutionError {
  readonly code = "InvalidLifecycleTransition";
}

/**
 * A real, per-execution lifecycle state machine — not a plain enum
 * field a caller could set to anything. Consults
 * `LIFECYCLE_TRANSITIONS` (contracts/indicator-lifecycle.interface.ts)
 * before allowing any transition, throwing
 * `InvalidLifecycleTransitionError` (a real, if narrowly-scoped,
 * addition to this phase's exception model — item 8's "invalid
 * lifecycle" check, made concrete) for anything the table doesn't
 * permit. One instance per execution, owned by `ComputationEngineService`
 * — never shared or reused across executions.
 */
export class ExecutionLifecycleTracker {
  private state: IndicatorLifecycleState = "REGISTERED";

  getState(): IndicatorLifecycleState {
    return this.state;
  }

  transitionTo(next: IndicatorLifecycleState): void {
    const allowed = LIFECYCLE_TRANSITIONS[this.state];
    if (!allowed.includes(next)) {
      throw new InvalidLifecycleTransitionError(`Cannot transition from "${this.state}" to "${next}".`, { from: this.state, to: next });
    }
    this.state = next;
  }
}
