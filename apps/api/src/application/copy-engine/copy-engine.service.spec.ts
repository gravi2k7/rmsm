import {
  applyCopyPositionRisk,
  calculateCopyQuantity,
} from "./copy-engine.types";

describe("calculateCopyQuantity", () => {
  it("uses source quantity multiplied by the member multiplier", () => {
    expect(
      calculateCopyQuantity({
        sourceQuantity: "2",
        quantityMultiplier: "1.5",
      }),
    ).toBe("3");
  });

  it("uses fixed quantity when configured", () => {
    expect(
      calculateCopyQuantity({
        sourceQuantity: "10",
        quantityMultiplier: "5",
        fixedQuantity: "2",
      }),
    ).toBe("2");
  });

  it("caps calculated quantity at max quantity", () => {
    expect(
      calculateCopyQuantity({
        sourceQuantity: "10",
        quantityMultiplier: "2",
        maxQuantity: "15",
      }),
    ).toBe("15");
  });

  it("rejects invalid source quantity", () => {
    expect(() =>
      calculateCopyQuantity({
        sourceQuantity: "0",
        quantityMultiplier: "1",
      }),
    ).toThrow("Source quantity must be greater than zero.");
  });

  it("rejects invalid multiplier", () => {
    expect(() =>
      calculateCopyQuantity({
        sourceQuantity: "1",
        quantityMultiplier: "0",
      }),
    ).toThrow("Quantity multiplier must be greater than zero.");
  });
});


describe("applyCopyPositionRisk", () => {
  it("allows an entry within the maximum position", () => {
    expect(
      applyCopyPositionRisk({
        executionKind: "ENTRY",
        requestedQuantity: "2",
        existingPositionQuantity: "3",
        maxPositionQuantity: "10",
      }),
    ).toEqual({
      allowed: true,
      quantity: "2",
    });
  });

  it("caps an entry at remaining position capacity", () => {
    expect(
      applyCopyPositionRisk({
        executionKind: "ENTRY",
        requestedQuantity: "5",
        existingPositionQuantity: "8",
        maxPositionQuantity: "10",
      }),
    ).toEqual({
      allowed: true,
      quantity: "2",
      reason: "Quantity capped by maximum position quantity.",
    });
  });

  it("allows an exit even when the maximum position is already reached", () => {
    expect(
      applyCopyPositionRisk({
        executionKind: "EXIT",
        requestedQuantity: "5",
        existingPositionQuantity: "10",
        maxPositionQuantity: "10",
      }),
    ).toEqual({
      allowed: true,
      quantity: "5",
    });
  });

  it("rejects a reversal instead of partially reducing it", () => {
    expect(
      applyCopyPositionRisk({
        executionKind: "REVERSAL",
        requestedQuantity: "5",
        existingPositionQuantity: "8",
        maxPositionQuantity: "10",
      }),
    ).toEqual({
      allowed: false,
      quantity: "0",
      reason:
        "Reversal quantity exceeds maximum position quantity; partial reversal is not allowed.",
    });
  });

  it("allows a full reversal when it fits the maximum position", () => {
    expect(
      applyCopyPositionRisk({
        executionKind: "REVERSAL",
        requestedQuantity: "5",
        existingPositionQuantity: "0",
        maxPositionQuantity: "10",
      }),
    ).toEqual({
      allowed: true,
      quantity: "5",
    });
  });

  it("rejects invalid position risk configuration", () => {
    expect(
      applyCopyPositionRisk({
        executionKind: "ENTRY",
        requestedQuantity: "1",
        existingPositionQuantity: "0",
        maxPositionQuantity: "0",
      }),
    ).toEqual({
      allowed: false,
      quantity: "0",
      reason: "Invalid position risk configuration.",
    });
  });
});
