import { authenticator } from "otplib";
import { TwoFactorService } from "../services/two-factor.service";
import type { Env } from "@rmsm/config";

const testConfig = {
  TWO_FACTOR_ENCRYPTION_KEY: "e".repeat(64),
  TWO_FACTOR_ISSUER: "RMSM AI Test",
} as Env;

describe("TwoFactorService", () => {
  const service = new TwoFactorService(testConfig);

  it("generates a secret and a valid otpauth URL", () => {
    const { secret, otpauthUrl } = service.generateSecret("user@example.com");
    expect(secret.length).toBeGreaterThan(0);
    expect(otpauthUrl).toContain("otpauth://totp/");
    expect(otpauthUrl).toContain("RMSM%20AI%20Test");
  });

  it("verifies a token generated from the same secret", () => {
    const { secret } = service.generateSecret("user@example.com");
    const validToken = authenticator.generate(secret);
    expect(service.verifyToken(secret, validToken)).toBe(true);
  });

  it("rejects an incorrect token", () => {
    const { secret } = service.generateSecret("user@example.com");
    expect(service.verifyToken(secret, "000000")).toBe(false);
  });

  it("encrypts and decrypts a secret round-trip", () => {
    const { secret } = service.generateSecret("user@example.com");
    const encrypted = service.encryptSecret(secret);
    expect(encrypted).not.toBe(secret);
    expect(service.decryptSecret(encrypted)).toBe(secret);
  });

  it("generates unique, correctly-hashed recovery codes", () => {
    const { raw, hashes } = service.generateRecoveryCodes(10);
    expect(raw).toHaveLength(10);
    expect(new Set(raw).size).toBe(10); // all unique
    raw.forEach((code, i) => {
      expect(service.hashRecoveryCode(code)).toBe(hashes[i]);
    });
  });
});
