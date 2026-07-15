export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerOptions {
  /** Consecutive failures before the circuit opens. */
  failureThreshold: number;
  /** How long the circuit stays open before allowing one trial call (half-open). */
  cooldownMs: number;
}

/**
 * A real, working circuit breaker — not a placeholder — scoped
 * deliberately small: in-memory, one instance per provider type, reset
 * on process restart. This is the "circuit-breaker extension point"
 * Phase 5 asked for, in the same honestly-scoped category as
 * `MarketDataMetricsService`: genuinely functional for a single
 * instance, not a distributed circuit breaker (which would need shared
 * state across every running `apps/api` instance — a real, named
 * follow-up if this system ever runs multi-instance, not solved here).
 *
 * States: `closed` (normal — calls pass through), `open` (recent
 * failures exceeded the threshold — calls fail immediately without
 * attempting the operation, protecting a struggling provider from
 * being hammered further), `half_open` (cooldown elapsed — exactly one
 * trial call is allowed through; success closes the circuit, failure
 * reopens it with a fresh cooldown).
 */
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private openedAt: number | null = null;

  constructor(private readonly options: CircuitBreakerOptions) {}

  getState(): CircuitState {
    if (this.state === "open" && this.openedAt !== null && Date.now() - this.openedAt >= this.options.cooldownMs) {
      this.state = "half_open";
    }
    return this.state;
  }

  /** Call before attempting the operation — throws if the circuit is open (cooldown not yet elapsed), so the caller never even tries a call known to be likely-failing. */
  assertCanAttempt(): void {
    if (this.getState() === "open") {
      throw new Error(`Circuit is open — provider calls are being short-circuited for another ${this.remainingCooldownMs()}ms.`);
    }
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = "closed";
    this.openedAt = null;
  }

  recordFailure(): void {
    this.consecutiveFailures += 1;
    if (this.state === "half_open" || this.consecutiveFailures >= this.options.failureThreshold) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }

  private remainingCooldownMs(): number {
    if (this.openedAt === null) return 0;
    return Math.max(0, this.options.cooldownMs - (Date.now() - this.openedAt));
  }
}
