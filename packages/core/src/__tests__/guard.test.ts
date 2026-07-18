import { describe, expect, it } from "vitest";
import { Guard } from "../validators";
import { InvariantViolationError } from "../errors";

describe("Guard.againstNullOrUndefined", () => {
  it("throws for null", () => {
    expect(() => Guard.againstNullOrUndefined(null, "field")).toThrow(InvariantViolationError);
  });
  it("throws for undefined", () => {
    expect(() => Guard.againstNullOrUndefined(undefined, "field")).toThrow(InvariantViolationError);
  });
  it("does not throw for a defined value, including falsy ones", () => {
    expect(() => Guard.againstNullOrUndefined(0, "field")).not.toThrow();
    expect(() => Guard.againstNullOrUndefined("", "field")).not.toThrow();
    expect(() => Guard.againstNullOrUndefined(false, "field")).not.toThrow();
  });
});

describe("Guard.againstEmptyString", () => {
  it("throws for an empty string", () => {
    expect(() => Guard.againstEmptyString("", "name")).toThrow(InvariantViolationError);
  });
  it("throws for a whitespace-only string", () => {
    expect(() => Guard.againstEmptyString("   ", "name")).toThrow(InvariantViolationError);
  });
  it("does not throw for a non-empty string", () => {
    expect(() => Guard.againstEmptyString("hello", "name")).not.toThrow();
  });
});

describe("Guard.againstOutOfRange", () => {
  it("throws below the range", () => {
    expect(() => Guard.againstOutOfRange(-1, 0, 10, "age")).toThrow(InvariantViolationError);
  });
  it("throws above the range", () => {
    expect(() => Guard.againstOutOfRange(11, 0, 10, "age")).toThrow(InvariantViolationError);
  });
  it("does not throw at the boundaries (inclusive)", () => {
    expect(() => Guard.againstOutOfRange(0, 0, 10, "age")).not.toThrow();
    expect(() => Guard.againstOutOfRange(10, 0, 10, "age")).not.toThrow();
  });
});

describe("Guard.againstNegative", () => {
  it("throws for a negative number", () => {
    expect(() => Guard.againstNegative(-0.01, "amount")).toThrow(InvariantViolationError);
  });
  it("does not throw for zero or positive", () => {
    expect(() => Guard.againstNegative(0, "amount")).not.toThrow();
    expect(() => Guard.againstNegative(5, "amount")).not.toThrow();
  });
});

describe("Guard.againstEmptyArray", () => {
  it("throws for an empty array", () => {
    expect(() => Guard.againstEmptyArray([], "items")).toThrow(InvariantViolationError);
  });
  it("does not throw for a non-empty array", () => {
    expect(() => Guard.againstEmptyArray([1], "items")).not.toThrow();
  });
});

describe("Guard.ensure", () => {
  it("throws with the given message when the condition is false", () => {
    expect(() => Guard.ensure(false, "custom failure message")).toThrow("custom failure message");
  });
  it("does not throw when the condition is true", () => {
    expect(() => Guard.ensure(true, "unused")).not.toThrow();
  });
});
