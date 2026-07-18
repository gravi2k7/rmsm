import { describe, expect, it } from "vitest";
import { Timer, time } from "../utils/timer";

describe("Timer", () => {
  it("measures a non-negative duration", () => {
    const timer = Timer.start();
    const elapsed = timer.stop();
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });

  it("stop() is idempotent — repeated calls return the same duration", async () => {
    const timer = Timer.start();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const first = timer.stop();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = timer.stop();
    expect(second).toBe(first);
  });

  it("elapsedMs() keeps advancing until stop() is called", async () => {
    const timer = Timer.start();
    const early = timer.elapsedMs();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const later = timer.elapsedMs();
    expect(later).toBeGreaterThanOrEqual(early);
  });

  it("elapsedMs() after stop() returns the final duration, not a new measurement", async () => {
    const timer = Timer.start();
    const stopped = timer.stop();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(timer.elapsedMs()).toBe(stopped);
  });
});

describe("time()", () => {
  it("returns the result of a synchronous function alongside its duration", async () => {
    const { result, durationMs } = await time(() => 42);
    expect(result).toBe(42);
    expect(durationMs).toBeGreaterThanOrEqual(0);
  });

  it("returns the result of an asynchronous function alongside its duration", async () => {
    const { result, durationMs } = await time(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return "done";
    });
    expect(result).toBe("done");
    expect(durationMs).toBeGreaterThanOrEqual(5);
  });

  it("propagates a thrown error rather than swallowing it", async () => {
    await expect(
      time(() => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
