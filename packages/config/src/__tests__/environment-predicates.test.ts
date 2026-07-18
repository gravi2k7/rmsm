import { describe, expect, it } from "vitest";
import { isDevelopment, isProduction, isStaging, isTest } from "../utils/config.helper";

describe("environment predicate helpers", () => {
  it.each([
    ["production", isProduction, true],
    ["production", isDevelopment, false],
    ["production", isTest, false],
    ["production", isStaging, false],
    ["development", isDevelopment, true],
    ["development", isProduction, false],
    ["test", isTest, true],
    ["test", isProduction, false],
    ["staging", isStaging, true],
    ["staging", isDevelopment, false],
  ] as const)("NODE_ENV=%s -> %s() is %s", (nodeEnv, predicate, expected) => {
    expect(predicate({ NODE_ENV: nodeEnv })).toBe(expected);
  });
});
