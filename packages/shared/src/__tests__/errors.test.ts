import { describe, it, expect } from "vitest";
import { NotFoundError, ValidationError } from "../errors";

describe("AppError subclasses", () => {
  it("NotFoundError carries a 404 status and NOT_FOUND code", () => {
    const e = new NotFoundError("User", "123");
    expect(e.statusCode).toBe(404);
    expect(e.code).toBe("NOT_FOUND");
    expect(e.message).toContain("User");
  });

  it("ValidationError carries a 400 status", () => {
    const e = new ValidationError("bad input");
    expect(e.statusCode).toBe(400);
  });
});
