import { describe, expect, it } from "vitest";
import { shouldRetry } from "../query-provider";
import { ApiError } from "@/lib/api-client";

describe("shouldRetry", () => {
  it("does not retry 4xx client errors", () => {
    const err = new ApiError({ statusCode: 404, message: "Not found" });
    expect(shouldRetry(0, err)).toBe(false);
  });

  it("does not retry a 401", () => {
    const err = new ApiError({ statusCode: 401, message: "Unauthorized" });
    expect(shouldRetry(0, err)).toBe(false);
  });

  it("does not retry a 422 validation error", () => {
    const err = new ApiError({ statusCode: 422, message: "Invalid" });
    expect(shouldRetry(0, err)).toBe(false);
  });

  it("retries a 500 once", () => {
    const err = new ApiError({ statusCode: 500, message: "Server error" });
    expect(shouldRetry(0, err)).toBe(true);
    expect(shouldRetry(1, err)).toBe(false);
  });

  it("retries a plain network error (non-ApiError) once", () => {
    const err = new TypeError("Failed to fetch");
    expect(shouldRetry(0, err)).toBe(true);
    expect(shouldRetry(1, err)).toBe(false);
  });
});
