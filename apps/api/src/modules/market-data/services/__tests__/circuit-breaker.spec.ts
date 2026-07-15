import { CircuitBreaker } from "../circuit-breaker";

describe("CircuitBreaker", () => {
  it("starts closed", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 1000 });
    expect(breaker.getState()).toBe("closed");
    expect(() => breaker.assertCanAttempt()).not.toThrow();
  });

  it("opens after reaching the failure threshold", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 10_000 });
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe("closed");
    breaker.recordFailure();
    expect(breaker.getState()).toBe("open");
  });

  it("throws from assertCanAttempt while open", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 10_000 });
    breaker.recordFailure();
    expect(() => breaker.assertCanAttempt()).toThrow("Circuit is open");
  });

  it("a success resets the consecutive-failure count and closes the circuit", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 10_000 });
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess();
    breaker.recordFailure();
    breaker.recordFailure();
    // Only 2 consecutive failures since the reset — threshold is 3, so still closed.
    expect(breaker.getState()).toBe("closed");
  });

  it("transitions to half_open after the cooldown elapses", async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 10 });
    breaker.recordFailure();
    expect(breaker.getState()).toBe("open");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(breaker.getState()).toBe("half_open");
  });

  it("a failure while half_open reopens the circuit immediately, not waiting for the full threshold again", async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 5, cooldownMs: 10 });
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe("open");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(breaker.getState()).toBe("half_open");
    breaker.recordFailure();
    expect(breaker.getState()).toBe("open");
  });

  it("a success while half_open closes the circuit", async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 10 });
    breaker.recordFailure();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(breaker.getState()).toBe("half_open");
    breaker.recordSuccess();
    expect(breaker.getState()).toBe("closed");
  });
});
