import { describe, expect, it } from "vitest";
import { assertNever, chunk, isDefined } from "../utils";

describe("assertNever", () => {
  it("throws, including the unexpected value in the message", () => {
    // @ts-expect-error -- intentionally passing a non-`never` value to exercise the runtime failure path
    expect(() => assertNever("unexpected")).toThrow(/unexpected/);
  });
});

describe("isDefined", () => {
  it("filters out null and undefined from an array while narrowing the type", () => {
    const input: (number | null | undefined)[] = [1, null, 2, undefined, 3];
    const result = input.filter(isDefined);
    expect(result).toEqual([1, 2, 3]);
  });

  it("returns true for falsy-but-defined values", () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined("")).toBe(true);
    expect(isDefined(false)).toBe(true);
  });

  it("returns false for null and undefined", () => {
    expect(isDefined(null)).toBe(false);
    expect(isDefined(undefined)).toBe(false);
  });
});

describe("chunk", () => {
  it("splits an array into fixed-size chunks", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns one chunk when size >= length", () => {
    expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
  });

  it("returns an empty array for an empty input", () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it("throws for a non-positive chunk size", () => {
    expect(() => chunk([1, 2, 3], 0)).toThrow();
    expect(() => chunk([1, 2, 3], -1)).toThrow();
  });
});
