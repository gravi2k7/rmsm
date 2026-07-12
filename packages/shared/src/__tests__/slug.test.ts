import { describe, expect, it } from "vitest";
import { checkSlugFormat, slugify } from "../slug";

describe("checkSlugFormat", () => {
  it("rejects a too-short slug", () => {
    expect(checkSlugFormat("ab").valid).toBe(false);
  });
  it("rejects uppercase letters", () => {
    expect(checkSlugFormat("MyOrg").valid).toBe(false);
  });
  it("rejects double hyphens", () => {
    expect(checkSlugFormat("my--org").valid).toBe(false);
  });
  it("rejects leading/trailing hyphens", () => {
    expect(checkSlugFormat("-my-org").valid).toBe(false);
    expect(checkSlugFormat("my-org-").valid).toBe(false);
  });
  it("accepts a well-formed slug", () => {
    expect(checkSlugFormat("acme-trading-desk").valid).toBe(true);
  });
});

describe("slugify", () => {
  it("converts a display name into a valid slug", () => {
    const result = slugify("Acme Trading Desk, LLC");
    expect(checkSlugFormat(result).valid).toBe(true);
    expect(result).toBe("acme-trading-desk-llc");
  });
});
