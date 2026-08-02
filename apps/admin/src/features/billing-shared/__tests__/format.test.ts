import { describe, expect, it } from "vitest";
import { formatCents, formatPercent, formatDate } from "../format";

describe("formatCents", () => {
  it("formats cents as currency", () => {
    expect(formatCents(199900)).toBe("$1,999.00");
  });

  it("respects a non-USD currency", () => {
    expect(formatCents(150000, "EUR")).toContain("1,500.00");
  });

  it("returns an em dash for null/undefined", () => {
    expect(formatCents(undefined)).toBe("—");
    expect(formatCents(null)).toBe("—");
  });
});

describe("formatPercent", () => {
  it("formats with one decimal by default", () => {
    expect(formatPercent(99.5)).toBe("99.5%");
  });

  it("returns an em dash for null", () => {
    expect(formatPercent(null)).toBe("—");
  });
});

describe("formatDate", () => {
  it("returns an em dash for a falsy value", () => {
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate(null)).toBe("—");
  });

  it("formats an ISO date string", () => {
    expect(formatDate("2026-03-15T00:00:00.000Z")).toMatch(/Mar/);
  });
});
