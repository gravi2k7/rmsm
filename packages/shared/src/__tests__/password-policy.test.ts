import { describe, expect, it } from "vitest";
import { checkPasswordPolicy } from "../password-policy";

describe("checkPasswordPolicy", () => {
  it("rejects a short password", () => {
    expect(checkPasswordPolicy("Ab1!").valid).toBe(false);
  });

  it("rejects a password missing a symbol", () => {
    expect(checkPasswordPolicy("Abcdefgh1234").valid).toBe(false);
  });

  it("accepts a policy-compliant password", () => {
    const result = checkPasswordPolicy("Str0ng!Passw0rd");
    expect(result.valid).toBe(true);
    expect(result.failures).toHaveLength(0);
  });
});
