import { describe, expect, it } from "vitest";
import { err, isErr, isOk, ok, unwrap } from "../results";

describe("ok/err", () => {
  it("ok() produces a success Result", () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(42);
  });

  it("err() produces a failure Result", () => {
    const result = err({ code: "X", message: "failed" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toEqual({ code: "X", message: "failed" });
  });
});

describe("isOk / isErr", () => {
  it("narrows a success Result", () => {
    const result = ok("value");
    expect(isOk(result)).toBe(true);
    expect(isErr(result)).toBe(false);
  });

  it("narrows a failure Result", () => {
    const result = err("boom");
    expect(isOk(result)).toBe(false);
    expect(isErr(result)).toBe(true);
  });
});

describe("unwrap", () => {
  it("returns the value for a success Result", () => {
    expect(unwrap(ok(7))).toBe(7);
  });

  it("throws the error for a failure Result", () => {
    const failure = new Error("boom");
    expect(() => unwrap(err(failure))).toThrow(failure);
  });
});
