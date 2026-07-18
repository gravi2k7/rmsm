import { describe, expect, it } from "vitest";
import { buildFeatureFlags, isFeatureEnabled } from "../utils/config.helper";

describe("buildFeatureFlags", () => {
  it("marks every listed name as enabled", () => {
    const flags = buildFeatureFlags(["new-dashboard", "beta-search"]);
    expect(flags["new-dashboard"]).toBe(true);
    expect(flags["beta-search"]).toBe(true);
  });

  it("produces an empty map for an empty list", () => {
    const flags = buildFeatureFlags([]);
    expect(Object.keys(flags)).toHaveLength(0);
  });

  it("the returned map is frozen (immutable)", () => {
    const flags = buildFeatureFlags(["x"]);
    expect(Object.isFrozen(flags)).toBe(true);
  });
});

describe("isFeatureEnabled", () => {
  it("returns true for a flag present in the map", () => {
    const flags = buildFeatureFlags(["new-dashboard"]);
    expect(isFeatureEnabled(flags, "new-dashboard")).toBe(true);
  });

  it("returns false for a flag not present in the map — safe default is off", () => {
    const flags = buildFeatureFlags(["new-dashboard"]);
    expect(isFeatureEnabled(flags, "unrelated-flag")).toBe(false);
  });

  it("returns false for an empty flag map", () => {
    expect(isFeatureEnabled(buildFeatureFlags([]), "anything")).toBe(false);
  });
});
