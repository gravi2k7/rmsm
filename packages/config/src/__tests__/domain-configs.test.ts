import { describe, expect, it } from "vitest";
import { validateEnv } from "../env/env.validator";
import { getAiConfig } from "../config/ai.config";
import { getAppConfig } from "../config/app.config";
import { getAuthConfig } from "../config/auth.config";
import { getDatabaseConfig } from "../config/database.config";
import { getLoggingConfig } from "../config/logging.config";
import { getMarketConfig } from "../config/market.config";
import { getTwelveDataConfig } from "../config/twelve-data.config";

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

describe("getTwelveDataConfig", () => {
  it("defaults timeout/retry/base URL, and leaves apiKey undefined when TWELVE_DATA_API_KEY is unset", () => {
    const config = getTwelveDataConfig(FIXTURE);
    expect(config).toEqual({
      apiKey: undefined,
      baseUrl: "https://api.twelvedata.com",
      timeoutMs: 10000,
      retryCount: 3,
      retryDelayMs: 500,
    });
  });

  it("reads TWELVE_DATA_API_KEY when present, never falling back to a default value for a credential", () => {
    const withKey = validateEnv({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      JWT_ACCESS_SECRET: "a".repeat(16),
      JWT_REFRESH_SECRET: "b".repeat(16),
      TWELVE_DATA_API_KEY: "td-live-key-123",
    });
    expect(getTwelveDataConfig(withKey).apiKey).toBe("td-live-key-123");
  });

  it("respects an overridden TWELVE_DATA_BASE_URL/TIMEOUT/RETRY_COUNT/RETRY_DELAY", () => {
    const withOverrides = validateEnv({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      JWT_ACCESS_SECRET: "a".repeat(16),
      JWT_REFRESH_SECRET: "b".repeat(16),
      TWELVE_DATA_BASE_URL: "https://staging.twelvedata.example.com",
      TWELVE_DATA_TIMEOUT: "5000",
      TWELVE_DATA_RETRY_COUNT: "5",
      TWELVE_DATA_RETRY_DELAY: "250",
    });
    expect(getTwelveDataConfig(withOverrides)).toEqual({
      apiKey: undefined,
      baseUrl: "https://staging.twelvedata.example.com",
      timeoutMs: 5000,
      retryCount: 5,
      retryDelayMs: 250,
    });
  });
});
