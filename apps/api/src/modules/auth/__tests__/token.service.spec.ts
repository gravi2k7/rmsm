import { JwtService } from "@nestjs/jwt";
import { TokenService } from "../services/token.service";
import type { Env } from "@rmsm/config";

const testConfig: Env = {
  NODE_ENV: "test",
  APP_ENV: "local",
  DATABASE_URL: "postgresql://x:x@localhost:5432/x",
  REDIS_URL: "redis://localhost:6379",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  JWT_ACCESS_TTL: "15m",
  JWT_REFRESH_TTL: "7d",
  AI_SERVICE_URL: "http://localhost:8000",
  API_PORT: 3001,
  WEB_PORT: 3000,
  ADMIN_PORT: 3002,
  AI_PORT: 8000,
  RATE_LIMIT_TTL_MS: 60000,
  RATE_LIMIT_MAX: 100,
  ACCOUNT_LOCKOUT_MAX_ATTEMPTS: 5,
  ACCOUNT_LOCKOUT_DURATION_MS: 900000,
  PASSWORD_MIN_LENGTH: 12,
  EMAIL_VERIFICATION_TTL_MS: 86400000,
  PASSWORD_RESET_TTL_MS: 3600000,
  TWO_FACTOR_ENCRYPTION_KEY: "c".repeat(64),
  TWO_FACTOR_ISSUER: "RMSM AI Test",
  COOKIE_SECRET: "d".repeat(32),
  EMAIL_PROVIDER: "console",
  EMAIL_FROM: "test@rmsm.ai",
  WEB_APP_URL: "http://localhost:3000",
} as Env;

describe("TokenService", () => {
  const service = new TokenService(new JwtService(), testConfig);

  it("signs and verifies an access token round-trip", () => {
    const token = service.signAccessToken({
      sub: "user-1",
      email: "a@b.com",
      roles: ["FREE_USER"],
      permissions: [],
      sessionId: "session-1",
    });
    const decoded = service.verifyAccessToken(token);
    expect(decoded.sub).toBe("user-1");
    expect(decoded.roles).toContain("FREE_USER");
  });

  it("rejects a token signed with a different secret", () => {
    const forged = new TokenService(new JwtService(), {
      ...testConfig,
      JWT_ACCESS_SECRET: "wrong-secret-wrong-secret-wrong",
    }).signAccessToken({
      sub: "user-1",
      email: "a@b.com",
      roles: [],
      permissions: [],
      sessionId: "s",
    });
    expect(() => service.verifyAccessToken(forged)).toThrow();
  });

  it("generates a refresh token whose hash is deterministic for the same raw value", () => {
    const { raw, hash } = service.generateRefreshToken();
    expect(service.hashToken(raw)).toBe(hash);
  });

  it("generates unique refresh tokens on each call", () => {
    const a = service.generateRefreshToken();
    const b = service.generateRefreshToken();
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).not.toBe(b.hash);
  });
});
