import { describe, expect, it } from "vitest";
import { SystemClock } from "../interfaces";

describe("SystemClock", () => {
  it("returns a Date close to the actual current time", () => {
    const before = Date.now();
    const clock = new SystemClock();
    const now = clock.now();
    const after = Date.now();

    expect(now).toBeInstanceOf(Date);
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    expect(now.getTime()).toBeLessThanOrEqual(after);
  });

  it("returns a fresh Date on each call", () => {
    const clock = new SystemClock();
    const first = clock.now();
    const second = clock.now();
    expect(first).not.toBe(second); // different instances
  });
});
