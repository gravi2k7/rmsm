import { describe, expect, it } from "vitest";
import { FixedWindowRateLimiter } from "../fixed-window-rate.limiter";
import { FixedClock } from "../../application/__tests__/fakes";

describe("FixedWindowRateLimiter", () => {
  it("allows up to the limit within a window, then denies", async () => {
    const clock = new FixedClock();
    const limiter = new FixedWindowRateLimiter(clock, 2, 1000);

    expect((await limiter.checkAndConsume("k1")).allowed).toBe(true);
    expect((await limiter.checkAndConsume("k1")).allowed).toBe(true);
    const third = await limiter.checkAndConsume("k1");
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("resets the count once the window elapses", async () => {
    const clock = new FixedClock();
    const limiter = new FixedWindowRateLimiter(clock, 1, 1000);

    expect((await limiter.checkAndConsume("k1")).allowed).toBe(true);
    expect((await limiter.checkAndConsume("k1")).allowed).toBe(false);

    clock.advanceMs(1001);
    expect((await limiter.checkAndConsume("k1")).allowed).toBe(true);
  });

  it("tracks separate windows per key", async () => {
    const clock = new FixedClock();
    const limiter = new FixedWindowRateLimiter(clock, 1, 1000);

    expect((await limiter.checkAndConsume("a")).allowed).toBe(true);
    expect((await limiter.checkAndConsume("b")).allowed).toBe(true);
  });
});
