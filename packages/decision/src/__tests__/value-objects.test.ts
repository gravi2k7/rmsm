import { describe, expect, it } from "vitest";
import { RiskScore } from "../value-objects/risk-score";
import { ApprovalStatus } from "../value-objects/approval-status";

describe("RiskScore", () => {
  it("accepts a score within 0-100", () => {
    expect(RiskScore.create(50).ok).toBe(true);
  });
  it("rejects a score below 0", () => {
    expect(RiskScore.create(-1).ok).toBe(false);
  });
  it("rejects a score above 100", () => {
    expect(RiskScore.create(101).ok).toBe(false);
  });
  it("isAcceptable() defaults to a 70 threshold", () => {
    const low = RiskScore.create(50);
    const high = RiskScore.create(90);
    expect(low.ok && low.value.isAcceptable()).toBe(true);
    expect(high.ok && high.value.isAcceptable()).toBe(false);
  });
  it("isAcceptable() accepts a custom threshold", () => {
    const result = RiskScore.create(50);
    expect(result.ok && result.value.isAcceptable(40)).toBe(false);
  });
});

describe("ApprovalStatus", () => {
  it("factory methods produce the expected value", () => {
    expect(ApprovalStatus.pending().value).toBe("PENDING");
    expect(ApprovalStatus.approved().value).toBe("APPROVED");
    expect(ApprovalStatus.rejected().value).toBe("REJECTED");
    expect(ApprovalStatus.manualReview().value).toBe("MANUAL_REVIEW");
  });
  it("isFinal() is true only for APPROVED/REJECTED", () => {
    expect(ApprovalStatus.approved().isFinal()).toBe(true);
    expect(ApprovalStatus.rejected().isFinal()).toBe(true);
    expect(ApprovalStatus.pending().isFinal()).toBe(false);
    expect(ApprovalStatus.manualReview().isFinal()).toBe(false);
  });
});
