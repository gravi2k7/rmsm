import { describe, expect, it } from "vitest";
import { derivePriority } from "../priority";

describe("derivePriority", () => {
  it("returns HIGH for strong signal strength with high confidence", () => {
    expect(derivePriority({ confidenceScore: 80, signalStrength: "STRONG" })).toBe("HIGH");
  });

  it("returns LOW for weak signal strength with low confidence", () => {
    expect(derivePriority({ confidenceScore: 30, signalStrength: "WEAK" })).toBe("LOW");
  });

  it("returns MEDIUM for a moderate combination", () => {
    expect(derivePriority({ confidenceScore: 50, signalStrength: "MODERATE" })).toBe("MEDIUM");
  });

  it("weighs signal strength, not confidence alone", () => {
    // Same confidence, different strength should be able to change tier.
    const weak = derivePriority({ confidenceScore: 70, signalStrength: "WEAK" });
    const strong = derivePriority({ confidenceScore: 70, signalStrength: "STRONG" });
    expect(strong).not.toBe(weak);
  });
});
