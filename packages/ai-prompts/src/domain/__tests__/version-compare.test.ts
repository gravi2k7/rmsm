import { describe, it, expect } from "vitest";
import { compareVersions } from "../version-compare";

describe("compareVersions", () => {
  it("compares numerically, not lexically — 1.10.0 is newer than 1.2.0", () => {
    expect(compareVersions("1.10.0", "1.2.0")).toBeGreaterThan(0);
  });

  it("returns 0 for equal versions", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
  });

  it("treats a missing trailing segment as 0", () => {
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.1", "1.0.0")).toBeGreaterThan(0);
  });

  it("falls back to string comparison for non-numeric segments", () => {
    expect(compareVersions("1.0.0-beta", "1.0.0-alpha")).toBeGreaterThan(0);
  });
});
