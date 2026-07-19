import { describe, expect, it } from "vitest";
import { Confidence } from "../value-objects/confidence";
import { SignalStrength } from "../value-objects/signal-strength";

describe("Confidence", () => {
  it("accepts a score within 0-100", () => {
    expect(Confidence.create(75).ok).toBe(true);
  });
  it("rejects a score below 0", () => {
    expect(Confidence.create(-1).ok).toBe(false);
  });
  it("rejects a score above 100", () => {
    expect(Confidence.create(101).ok).toBe(false);
  });
  it("isHigh() is true at 75 and above", () => {
    const result = Confidence.create(75);
    expect(result.ok && result.value.isHigh()).toBe(true);
  });
  it("isLow() is true below 40", () => {
    const result = Confidence.create(39);
    expect(result.ok && result.value.isLow()).toBe(true);
  });
});

describe("SignalStrength.fromMagnitude", () => {
  it("derives WEAK for a low magnitude", () => {
    const result = SignalStrength.fromMagnitude(0.1);
    expect(result.ok && result.value.level).toBe("WEAK");
  });
  it("derives MODERATE for a mid magnitude", () => {
    const result = SignalStrength.fromMagnitude(0.5);
    expect(result.ok && result.value.level).toBe("MODERATE");
  });
  it("derives STRONG for a high magnitude", () => {
    const result = SignalStrength.fromMagnitude(0.9);
    expect(result.ok && result.value.level).toBe("STRONG");
  });
  it("rejects a magnitude outside 0-1", () => {
    expect(SignalStrength.fromMagnitude(1.5).ok).toBe(false);
    expect(SignalStrength.fromMagnitude(-0.1).ok).toBe(false);
  });
});
