import { describe, expect, it } from "vitest";
import { validateEnv } from "../env/env.validator";
import { getAiConfig } from "../config/ai.config";
import { getAppConfig } from "../config/app.config";
import { getAuthConfig } from "../config/auth.config";
import { getDatabaseConfig } from "../config/database.config";
import { getLoggingConfig } from "../config/logging.config";
import { getMarketConfig } from "../config/market.config";

const FIXTURE = validateEnv({
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  JWT_ACCESS_SECRET: "a".repeat(16),
  JWT_REFRESH_SECRET: "b".repeat(16),
  FEATURE_FLAGS: "new-dashboard,beta-search",
  OAUTH_GOOGLE_CLIENT_ID: "google-client-id",
});

describe("getAppConfig", () => {
  it("nests ports under ports.*", () => {
    const config = getAppConfig(FIXTURE);
    expect(config.ports).toEqual({ api: 3001, web: 3000, admin: 3002 });
  });

  it("nests rate limiting under rateLimit.*", () => {
    const config = getAppConfig(FIXTURE);
    expect(config.rateLimit).toEqual({ ttlMs: 60000, max: 100 });
  });

  it("builds featureFlags from FEATURE_FLAGS", () => {
    const config = getAppConfig(FIXTURE);
    expect(config.featureFlags["new-dashboard"]).toBe(true);
    expect(config.featureFlags["beta-search"]).toBe(true);
    expect(config.featureFlags["unrelated"]).toBeUndefined();
  });
});

describe("getDatabaseConfig", () => {
  it("maps DATABASE_URL/REDIS_URL to url/redisUrl", () => {
    const config = getDatabaseConfig(FIXTURE);
    expect(config).toEqual({
      url: "postgresql://user:pass@localhost:5432/db",
      redisUrl: "redis://localhost:6379",
    });
  });
});

describe("getAuthConfig", () => {
  it("nests JWT settings under jwt.*", () => {
    const config = getAuthConfig(FIXTURE);
    expect(config.jwt.accessSecret).toBe("a".repeat(16));
    expect(config.jwt.accessTtl).toBe("15m");
  });

  it("nests OAuth providers under oauth.<provider>.*, leaving unset providers undefined", () => {
    const config = getAuthConfig(FIXTURE);
    expect(config.oauth.google.clientId).toBe("google-client-id");
    expect(config.oauth.github.clientId).toBeUndefined();
  });

  it("nests SMTP settings under email.smtp.*", () => {
    const config = getAuthConfig(FIXTURE);
    expect(config.email.provider).toBe("console");
    expect(config.email.smtp.host).toBeUndefined();
  });
});

describe("getLoggingConfig", () => {
  it("exposes level/format with their defaults", () => {
    const config = getLoggingConfig(FIXTURE);
    expect(config.level).toBe("info");
    expect(config.format).toBe("json");
  });
});

describe("getAiConfig", () => {
  it("exposes the AI service URL and port with defaults", () => {
    const config = getAiConfig(FIXTURE);
    expect(config.serviceUrl).toBe("http://localhost:8000");
    expect(config.port).toBe(8000);
  });
});

describe("getMarketConfig", () => {
  it("exposes operational tuning values with defaults", () => {
    const config = getMarketConfig(FIXTURE);
    expect(config).toEqual({
      syncIntervalMs: 60000,
      cacheTtlMs: 5000,
      requestTimeoutMs: 10000,
      maxConcurrentRequests: 10,
    });
  });
});
