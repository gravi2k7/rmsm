import { describe, expect, it } from "vitest";
import { Price } from "../../value-objects/price";

describe("Price.create", () => {
  it("creates a valid price and rounds to the given precision", () => {
    const result = Price.create(1.234567, 5);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.amount).toBe(1.23457);
  });

  it("rejects a negative amount", () => {
    const result = Price.create(-1, 2);
    expect(result.ok).toBe(false);
  });

  it("rejects a non-finite amount", () => {
    expect(Price.create(Infinity, 2).ok).toBe(false);
    expect(Price.create(NaN, 2).ok).toBe(false);
  });

  it("rejects a negative precision", () => {
    expect(Price.create(1, -1).ok).toBe(false);
  });

  it("rejects a precision above the maximum", () => {
    expect(Price.create(1, 11).ok).toBe(false);
  });

  it("accepts zero as a valid amount", () => {
    expect(Price.create(0, 2).ok).toBe(true);
  });
});

describe("Price equality", () => {
  it("two prices with the same amount and precision are equal", () => {
    const a = Price.create(1.2345, 4);
    const b = Price.create(1.2345, 4);
    expect(a.ok && b.ok && a.value.equals(b.value)).toBe(true);
  });

  it("prices that round to the same value are equal, even from different raw input", () => {
    const a = Price.create(1.23454, 4);
    const b = Price.create(1.2345, 4);
    expect(a.ok && b.ok && a.value.equals(b.value)).toBe(true);
  });
});

describe("Price.add / subtract", () => {
  it("adds two prices of the same precision", () => {
    const a = Price.create(1.5, 2);
    const b = Price.create(0.25, 2);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      const sum = a.value.add(b.value);
      expect(sum.ok && sum.value.amount).toBe(1.75);
    }
  });

  it("rejects combining prices of different precision", () => {
    const a = Price.create(1.5, 2);
    const b = Price.create(1.5, 4);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.value.add(b.value).ok).toBe(false);
    }
  });

  it("subtract can produce a rejected negative Price (Price itself never goes negative)", () => {
    const a = Price.create(1.0, 2);
    const b = Price.create(2.0, 2);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.value.subtract(b.value).ok).toBe(false);
    }
  });
});

describe("Price comparisons", () => {
  it("isGreaterThan / isLessThan compare by amount", () => {
    const low = Price.create(1.0, 2);
    const high = Price.create(2.0, 2);
    expect(low.ok && high.ok).toBe(true);
    if (low.ok && high.ok) {
      expect(high.value.isGreaterThan(low.value)).toBe(true);
      expect(low.value.isLessThan(high.value)).toBe(true);
    }
  });
});

describe("Price.toString", () => {
  it("formats with the configured precision, including trailing zeros", () => {
    const result = Price.create(1.5, 4);
    expect(result.ok && result.value.toString()).toBe("1.5000");
  });
});
