import { describe, it, expect } from "vitest";
import { ConfidenceScorer } from "../services/confidence-scorer.service";
import { InvalidConfidenceThresholdError } from "../../domain/errors/classification-domain.errors";

describe("ConfidenceScorer", () => {
  const scorer = new ConfidenceScorer();

  it("returns true when confidence meets the threshold", () => {
    expect(scorer.isConfident(0.8, 0.5)).toBe(true);
  });

  it("returns false when confidence is below the threshold", () => {
    expect(scorer.isConfident(0.3, 0.5)).toBe(false);
  });

  it("throws InvalidConfidenceThresholdError for an out-of-range threshold", () => {
    expect(() => scorer.isConfident(0.5, 1.5)).toThrow(InvalidConfidenceThresholdError);
  });

  it("clamp() bounds a value to [0, 1]", () => {
    expect(scorer.clamp(-0.5)).toBe(0);
    expect(scorer.clamp(1.5)).toBe(1);
    expect(scorer.clamp(0.5)).toBe(0.5);
  });
});
