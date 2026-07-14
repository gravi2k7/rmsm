import { normalizeDecimal } from "../normalizers/decimal.normalizer";
import { InvalidPrecisionError } from "../../validation/errors/market-data-validation.error";

describe("normalizeDecimal", () => {
  it("accepts a plain decimal string unchanged in value", () => {
    expect(normalizeDecimal("100.50", { maxScale: 10 })).toBe("100.5");
  });

  it("accepts a number input without floating-point representation error", () => {
    expect(normalizeDecimal(100.1, { maxScale: 10 })).toBe("100.1");
  });

  it("strips leading zeros from the integer part", () => {
    expect(normalizeDecimal("007.5", { maxScale: 10 })).toBe("7.5");
  });

  it("strips trailing zeros from the fractional part", () => {
    expect(normalizeDecimal("100.5000", { maxScale: 10 })).toBe("100.5");
  });

  it("reduces a whole number to no decimal point at all", () => {
    expect(normalizeDecimal("100.00", { maxScale: 10 })).toBe("100");
  });

  it("rejects a value exceeding maxScale", () => {
    expect(() => normalizeDecimal("1.123456789012", { maxScale: 10 })).toThrow(InvalidPrecisionError);
  });

  it("rejects a negative value when allowNegative is not set", () => {
    expect(() => normalizeDecimal("-5.00", { maxScale: 10 })).toThrow(InvalidPrecisionError);
  });

  it("accepts a negative value when allowNegative is true", () => {
    expect(normalizeDecimal("-5.25", { maxScale: 10, allowNegative: true })).toBe("-5.25");
  });

  it("rejects a malformed decimal string", () => {
    expect(() => normalizeDecimal("not-a-number", { maxScale: 10 })).toThrow(InvalidPrecisionError);
  });

  it("rejects scientific notation", () => {
    expect(() => normalizeDecimal("1e10", { maxScale: 10 })).toThrow(InvalidPrecisionError);
  });

  it("rejects a number exceeding MAX_SAFE_INTEGER, directing the caller to pass a string instead", () => {
    expect(() => normalizeDecimal(Number.MAX_SAFE_INTEGER * 2, { maxScale: 10 })).toThrow(InvalidPrecisionError);
  });

  it("does not produce '-0' for a negative value that normalizes to zero", () => {
    expect(normalizeDecimal("-0.00", { maxScale: 10, allowNegative: true })).toBe("0");
  });
});
