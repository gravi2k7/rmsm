import { describe, expect, it } from "vitest";
import { envSchema, validateEnv } from "../env/env.validator";
import { ConfigValidationError } from "../types/config.types";

const MINIMAL_VALID_ENV = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  JWT_ACCESS_SECRET: "a".repeat(16),
  JWT_REFRESH_SECRET: "b".repeat(16),
};

describe("envSchema — valid configuration", () => {
  it("accepts a minimal valid config and applies defaults", () => {
    const result = envSchema.safeParse(MINIMAL_VALID_ENV);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.API_PORT).toBe(3001);
      expect(result.data.NODE_ENV).toBe("development");
    }
  });

  it("accepts a fully-populated config across every domain", () => {
    const result = envSchema.safeParse({
      ...MINIMAL_VALID_ENV,
      NODE_ENV: "production",
      APP_ENV: "production",
      API_PORT: "4001",
      AI_SERVICE_URL: "https://ai.example.com",
      LOG_LEVEL: "warn",
      LOG_FORMAT: "pretty",
      MARKET_DATA_SYNC_INTERVAL_MS: "30000",
      FEATURE_FLAGS: "new-dashboard,beta-search",
      // A real production config must override every insecure dev
      // default — see "envSchema — production/staging secret guard"
      // below for what happens when it doesn't.
      WEB_APP_URL: "https://app.example.com",
      COOKIE_SECRET: "a".repeat(32),
      TWO_FACTOR_ENCRYPTION_KEY: "b".repeat(64),
      NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY: "c".repeat(64),
      MOCK_WEBHOOK_SECRET: "d".repeat(32),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe("production");
      expect(result.data.API_PORT).toBe(4001);
      expect(result.data.LOG_LEVEL).toBe("warn");
      expect(result.data.MARKET_DATA_SYNC_INTERVAL_MS).toBe(30000);
      expect(result.data.FEATURE_FLAGS).toEqual(["new-dashboard", "beta-search"]);
    }
  });
});

describe("envSchema — missing required variables", () => {
  it("rejects an empty config (missing DATABASE_URL, REDIS_URL, JWT secrets)", () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("DATABASE_URL");
      expect(paths).toContain("REDIS_URL");
      expect(paths).toContain("JWT_ACCESS_SECRET");
      expect(paths).toContain("JWT_REFRESH_SECRET");
    }
  });

  it("rejects a config missing only DATABASE_URL", () => {
    const rest: Record<string, string> = { ...MINIMAL_VALID_ENV };
    delete rest.DATABASE_URL;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe("envSchema — invalid environment values", () => {
  it("rejects a DATABASE_URL that isn't a URL or postgresql:// string", () => {
    const result = envSchema.safeParse({ ...MINIMAL_VALID_ENV, DATABASE_URL: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("rejects a REDIS_URL without the redis:// scheme", () => {
    const result = envSchema.safeParse({ ...MINIMAL_VALID_ENV, REDIS_URL: "http://localhost:6379" });
    expect(result.success).toBe(false);
  });

  it("rejects a JWT secret shorter than 16 characters", () => {
    const result = envSchema.safeParse({ ...MINIMAL_VALID_ENV, JWT_ACCESS_SECRET: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid NODE_ENV value", () => {
    const result = envSchema.safeParse({ ...MINIMAL_VALID_ENV, NODE_ENV: "sandbox" });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-range port number", () => {
    const result = envSchema.safeParse({ ...MINIMAL_VALID_ENV, API_PORT: "99999" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-numeric port number", () => {
    const result = envSchema.safeParse({ ...MINIMAL_VALID_ENV, API_PORT: "not-a-number" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid LOG_LEVEL value", () => {
    const result = envSchema.safeParse({ ...MINIMAL_VALID_ENV, LOG_LEVEL: "verbose" });
    expect(result.success).toBe(false);
  });

  it("rejects a two-factor encryption key shorter than 32 characters", () => {
    const result = envSchema.safeParse({ ...MINIMAL_VALID_ENV, TWO_FACTOR_ENCRYPTION_KEY: "short-key" });
    expect(result.success).toBe(false);
  });
});

describe("envSchema — default values", () => {
  it.each([
    ["NODE_ENV", "development"],
    ["APP_ENV", "local"],
    ["API_PORT", 3001],
    ["WEB_PORT", 3000],
    ["ADMIN_PORT", 3002],
    ["AI_PORT", 8000],
    ["RATE_LIMIT_TTL_MS", 60000],
    ["RATE_LIMIT_MAX", 100],
    ["WEB_APP_URL", "http://localhost:3000"],
    ["JWT_ACCESS_TTL", "15m"],
    ["JWT_REFRESH_TTL", "7d"],
    ["ACCOUNT_LOCKOUT_MAX_ATTEMPTS", 5],
    ["PASSWORD_MIN_LENGTH", 12],
    ["EMAIL_PROVIDER", "console"],
    ["LOG_LEVEL", "info"],
    ["LOG_FORMAT", "json"],
    ["MARKET_DATA_SYNC_INTERVAL_MS", 60000],
    ["MARKET_DATA_CACHE_TTL_MS", 5000],
    ["MARKET_DATA_MAX_CONCURRENT_REQUESTS", 10],
    ["STRATEGY_OUTBOX_PUBLISHER_ENABLED", true],
    ["STRATEGY_OUTBOX_MAX_RETRIES", 5],
  ] as const)("defaults %s to %j when absent", (field, expected) => {
    const result = envSchema.safeParse(MINIMAL_VALID_ENV);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[field as keyof typeof result.data]).toEqual(expected);
    }
  });

  it("defaults FEATURE_FLAGS to an empty array when absent", () => {
    const result = envSchema.safeParse(MINIMAL_VALID_ENV);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.FEATURE_FLAGS).toEqual([]);
  });
});

describe("validateEnv", () => {
  it("returns validated, typed data for a valid raw env object", () => {
    const env = validateEnv(MINIMAL_VALID_ENV);
    expect(env.DATABASE_URL).toBe(MINIMAL_VALID_ENV.DATABASE_URL);
    expect(env.API_PORT).toBe(3001);
  });

  it("throws a ConfigValidationError (not a raw ZodError) for an invalid raw env object", () => {
    expect(() => validateEnv({})).toThrow(ConfigValidationError);
  });

  it("the thrown error's message lists every missing/invalid field", () => {
    let caught: unknown;
    try {
      validateEnv({});
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ConfigValidationError);
    const error = caught as ConfigValidationError;
    expect(error.issues.some((i) => i.startsWith("DATABASE_URL"))).toBe(true);
    expect(error.message).toContain("Invalid environment configuration");
  });
});

describe("envSchema — production/staging insecure-default guard", () => {
  const INSECURE_DEFAULTS = {
    COOKIE_SECRET: "dev-cookie-secret-change-me!!",
    TWO_FACTOR_ENCRYPTION_KEY: "0".repeat(64),
    NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY: "1".repeat(64),
    MOCK_WEBHOOK_SECRET: "mock-webhook-secret-dev-only",
  } as const;

  it.each(["production", "staging"] as const)("rejects every known dev-default secret when NODE_ENV=%s", (nodeEnv) => {
    const result = envSchema.safeParse({ ...MINIMAL_VALID_ENV, NODE_ENV: nodeEnv });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      for (const field of Object.keys(INSECURE_DEFAULTS)) {
        expect(paths).toContain(field);
      }
    }
  });

  it.each(["production", "staging"] as const)("rejects a localhost WEB_APP_URL when NODE_ENV=%s", (nodeEnv) => {
    const result = envSchema.safeParse({ ...MINIMAL_VALID_ENV, NODE_ENV: nodeEnv });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join(".") === "WEB_APP_URL")).toBe(true);
    }
  });

  it.each(["development", "test"] as const)("does NOT reject dev-default secrets when NODE_ENV=%s (local ergonomics preserved)", (nodeEnv) => {
    const result = envSchema.safeParse({ ...MINIMAL_VALID_ENV, NODE_ENV: nodeEnv });
    expect(result.success).toBe(true);
  });

  it("accepts production when every insecure default is explicitly overridden", () => {
    const result = envSchema.safeParse({
      ...MINIMAL_VALID_ENV,
      NODE_ENV: "production",
      WEB_APP_URL: "https://app.example.com",
      COOKIE_SECRET: "a".repeat(32),
      TWO_FACTOR_ENCRYPTION_KEY: "b".repeat(64),
      NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY: "c".repeat(64),
      MOCK_WEBHOOK_SECRET: "d".repeat(32),
    });
    expect(result.success).toBe(true);
  });

  it("reports every insecure field in a single pass, not just the first", () => {
    const result = envSchema.safeParse({ ...MINIMAL_VALID_ENV, NODE_ENV: "production" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = new Set(result.error.issues.map((i) => i.path.join(".")));
      expect(paths.size).toBeGreaterThanOrEqual(Object.keys(INSECURE_DEFAULTS).length + 1); // + WEB_APP_URL
    }
  });

  it("validateEnv's ConfigValidationError message names the offending fields and hints at a fix", () => {
    let caught: unknown;
    try {
      validateEnv({ ...MINIMAL_VALID_ENV, NODE_ENV: "production" });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ConfigValidationError);
    const error = caught as ConfigValidationError;
    expect(error.issues.some((i) => i.startsWith("COOKIE_SECRET") && i.includes("production"))).toBe(true);
  });

  it.each(["production", "staging"] as const)("rejects a wildcard CORS_ALLOWED_ORIGINS when NODE_ENV=%s (SEC-001 fix)", (nodeEnv) => {
    const result = envSchema.safeParse({
      ...MINIMAL_VALID_ENV,
      NODE_ENV: nodeEnv,
      WEB_APP_URL: "https://app.example.com",
      COOKIE_SECRET: "a".repeat(32),
      TWO_FACTOR_ENCRYPTION_KEY: "b".repeat(64),
      NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY: "c".repeat(64),
      MOCK_WEBHOOK_SECRET: "d".repeat(32),
      CORS_ALLOWED_ORIGINS: "*",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join(".") === "CORS_ALLOWED_ORIGINS")).toBe(true);
    }
  });

  it.each(["production", "staging"] as const)("rejects a wildcard mixed in with real origins when NODE_ENV=%s", (nodeEnv) => {
    const result = envSchema.safeParse({
      ...MINIMAL_VALID_ENV,
      NODE_ENV: nodeEnv,
      WEB_APP_URL: "https://app.example.com",
      COOKIE_SECRET: "a".repeat(32),
      TWO_FACTOR_ENCRYPTION_KEY: "b".repeat(64),
      NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY: "c".repeat(64),
      MOCK_WEBHOOK_SECRET: "d".repeat(32),
      CORS_ALLOWED_ORIGINS: "https://app.example.com,*",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join(".") === "CORS_ALLOWED_ORIGINS")).toBe(true);
    }
  });

  it("accepts an explicit, non-wildcard CORS_ALLOWED_ORIGINS list in production", () => {
    const result = envSchema.safeParse({
      ...MINIMAL_VALID_ENV,
      NODE_ENV: "production",
      WEB_APP_URL: "https://app.example.com",
      COOKIE_SECRET: "a".repeat(32),
      TWO_FACTOR_ENCRYPTION_KEY: "b".repeat(64),
      NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY: "c".repeat(64),
      MOCK_WEBHOOK_SECRET: "d".repeat(32),
      CORS_ALLOWED_ORIGINS: "https://app.example.com,https://admin.example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.CORS_ALLOWED_ORIGINS).toEqual(["https://app.example.com", "https://admin.example.com"]);
    }
  });

  it("does not require CORS_ALLOWED_ORIGINS to be set in production — an empty allowlist is not a fail-fast condition (main.ts falls back to WEB_APP_URL instead)", () => {
    const result = envSchema.safeParse({
      ...MINIMAL_VALID_ENV,
      NODE_ENV: "production",
      WEB_APP_URL: "https://app.example.com",
      COOKIE_SECRET: "a".repeat(32),
      TWO_FACTOR_ENCRYPTION_KEY: "b".repeat(64),
      NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY: "c".repeat(64),
      MOCK_WEBHOOK_SECRET: "d".repeat(32),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.CORS_ALLOWED_ORIGINS).toEqual([]);
    }
  });
});
