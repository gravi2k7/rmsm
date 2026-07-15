import { ExecutionLifecycleTracker } from "../execution-lifecycle-tracker";

describe("ExecutionLifecycleTracker", () => {
  it("starts in REGISTERED", () => {
    expect(new ExecutionLifecycleTracker().getState()).toBe("REGISTERED");
  });

  it("allows the full happy-path sequence: REGISTERED -> VALIDATED -> INITIALIZED -> READY -> EXECUTING -> COMPLETED", () => {
    const tracker = new ExecutionLifecycleTracker();
    tracker.transitionTo("VALIDATED");
    tracker.transitionTo("INITIALIZED");
    tracker.transitionTo("READY");
    tracker.transitionTo("EXECUTING");
    tracker.transitionTo("COMPLETED");
    expect(tracker.getState()).toBe("COMPLETED");
  });

  it("rejects skipping a state (REGISTERED -> EXECUTING directly)", () => {
    const tracker = new ExecutionLifecycleTracker();
    expect(() => tracker.transitionTo("EXECUTING")).toThrow();
  });

  it("rejects any transition out of a terminal state (COMPLETED -> anything)", () => {
    const tracker = new ExecutionLifecycleTracker();
    tracker.transitionTo("VALIDATED");
    tracker.transitionTo("INITIALIZED");
    tracker.transitionTo("READY");
    tracker.transitionTo("EXECUTING");
    tracker.transitionTo("COMPLETED");
    expect(() => tracker.transitionTo("FAILED")).toThrow();
  });

  it("allows READY -> FAILED (a real gap this phase's own verification caught and fixed)", () => {
    const tracker = new ExecutionLifecycleTracker();
    tracker.transitionTo("VALIDATED");
    tracker.transitionTo("INITIALIZED");
    tracker.transitionTo("READY");
    expect(() => tracker.transitionTo("FAILED")).not.toThrow();
  });

  it("allows READY -> CANCELLED", () => {
    const tracker = new ExecutionLifecycleTracker();
    tracker.transitionTo("VALIDATED");
    tracker.transitionTo("INITIALIZED");
    tracker.transitionTo("READY");
    expect(() => tracker.transitionTo("CANCELLED")).not.toThrow();
  });

  it("allows EXECUTING -> FAILED", () => {
    const tracker = new ExecutionLifecycleTracker();
    tracker.transitionTo("VALIDATED");
    tracker.transitionTo("INITIALIZED");
    tracker.transitionTo("READY");
    tracker.transitionTo("EXECUTING");
    expect(() => tracker.transitionTo("FAILED")).not.toThrow();
  });
});
