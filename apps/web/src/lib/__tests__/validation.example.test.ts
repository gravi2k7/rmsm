import { describe, expect, it } from "vitest";
import { exampleFormSchema } from "../validation.example";

describe("exampleFormSchema", () => {
  it("rejects an invalid email", () => {
    expect(exampleFormSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
  it("accepts a valid email", () => {
    expect(exampleFormSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });
});
