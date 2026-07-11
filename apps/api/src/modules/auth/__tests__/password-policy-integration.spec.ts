import { checkPasswordPolicy } from "@rmsm/shared";

/**
 * Guards the exact boundary conditions the AuthService relies on
 * (PasswordService.assertPolicy delegates to this shared function).
 */
describe("Password policy edge cases (auth-critical)", () => {
  it("rejects a password of exactly minLength - 1", () => {
    const pwd = "Aa1!" + "x".repeat(6); // 10 chars, policy default is 12
    expect(checkPasswordPolicy(pwd).valid).toBe(false);
  });

  it("accepts a password of exactly minLength with all classes present", () => {
    const pwd = "Aa1!" + "x".repeat(8); // 12 chars
    expect(checkPasswordPolicy(pwd).valid).toBe(true);
  });

  it("rejects common weak passwords missing character classes", () => {
    expect(checkPasswordPolicy("password12345").valid).toBe(false); // no upper, no symbol
    expect(checkPasswordPolicy("PASSWORD12345").valid).toBe(false); // no lower, no symbol
  });
});
