import { describe, expect, it } from "vitest";
import { RunIdSeededIdGenerator } from "../run-id-seeded-id.generator";

describe("RunIdSeededIdGenerator", () => {
  it("returns the seeded id exactly once, then delegates to the fallback", () => {
    let counter = 0;
    const fallback = { generate: () => `fallback-${(counter += 1)}` };
    const generator = new RunIdSeededIdGenerator("run-1", fallback);

    expect(generator.generate()).toBe("run-1");
    expect(generator.generate()).toBe("fallback-1");
    expect(generator.generate()).toBe("fallback-2");
  });
});
