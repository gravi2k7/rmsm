import { describe, expect, it } from "vitest";
import { toInputJsonValue } from "../json";

describe("toInputJsonValue", () => {
  it("passes through a plain JSON-safe object unchanged", () => {
    expect(toInputJsonValue({ a: 1, b: "two", c: true })).toEqual({ a: 1, b: "two", c: true });
  });

  it("accepts a named interface/class instance without an index signature (the Module 004 bug this fixes)", () => {
    class Address {
      constructor(
        public line1: string,
        public city: string,
      ) {}
    }
    const result = toInputJsonValue(new Address("123 Main St", "Springfield"));
    expect(result).toEqual({ line1: "123 Main St", city: "Springfield" });
  });

  it("strips non-JSON-safe values (functions, undefined) the same way a real jsonb column would", () => {
    const input = { keep: "yes", fn: () => "dropped", missing: undefined };
    const result = toInputJsonValue(input) as Record<string, unknown>;
    expect(result.keep).toBe("yes");
    expect(result.fn).toBeUndefined();
    expect("missing" in result).toBe(false);
  });

  it("handles nested objects and arrays", () => {
    const input = { list: [1, 2, { nested: true }] };
    expect(toInputJsonValue(input)).toEqual({ list: [1, 2, { nested: true }] });
  });
});
